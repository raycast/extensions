import { createHash, randomUUID } from "crypto";
import { categories, loadCategories } from "./categories";
import { Clipboard, getPreferenceValues } from "@raycast/api";
import { lstat, mkdir, mkdtemp, open, readdir, rm, stat } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { fileURLToPath } from "url";
import * as windows from "./windows";

const kinds = [...categories, "custom"] as const;
const expiry = 24 * 60 * 60 * 1000;
type Session = {
  directory: string;
  style: string;
  blurFaces: boolean;
  reviewKey?: string;
  width: number;
  height: number;
  current: Scan;
  disposed: boolean;
  pending?: Promise<Scan>;
  copies: Set<Promise<void>>;
};
const sessions = new WeakMap<Scan, Session>();
const isWindows = process.platform === "win32";
// Loaded on demand so Windows never evaluates the macOS Swift binding.
const swift = () => import("swift:../swift/hide-details");
const noImageMessage = "Clipboard has no image.";
// Raycast exposes six recent history entries as text, HTML, or copied file paths.
// Screenshot image representations are not exposed by Clipboard.read().
const historyOffsets = [0, 1, 2, 3, 4, 5];
const imageExtensions = isWindows
  ? [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff"]
  : [".png", ".jpg", ".jpeg", ".bmp", ".gif", ".tif", ".tiff", ".heic", ".webp"];

export type Hit = {
  kind: (typeof kinds)[number];
  text: string;
  confidence: number;
  confidenceSource: "ocr" | "face" | "rule";
  box: { x: number; y: number; width: number; height: number };
};

export type HistoryImage = { offset: number; path: string; modified: Date };

export type ScanSource = { kind: "clipboard" } | ({ kind: "history" } & HistoryImage);

export type Report = {
  hits: Hit[];
  regionCount: number;
  output: string;
  // Null when the image came from a file rather than the live clipboard.
  clipboardChangeCount: number | null;
};

export type Detection = Hit & { id: string };
export type Scan = Readonly<
  Omit<Report, "hits"> & { hits: Detection[]; excludedIds: readonly string[]; source: ScanSource }
>;

// Identity belongs to a scan and a detection's content/geometry, never its list position.
function identifyHits(hits: Hit[], scope: string): Detection[] {
  const unique = new Map<string, Detection>();
  for (const hit of hits) {
    const { x, y, width, height } = hit.box;
    const id = createHash("sha256")
      .update(JSON.stringify([scope, hit.kind, hit.text, hit.confidenceSource, x, y, width, height]))
      .digest("hex");
    unique.set(id, { ...hit, id });
  }
  return [...unique.values()];
}

function regionCount(hits: Hit[]) {
  return new Set(hits.map(({ box }) => JSON.stringify([box.x, box.y, box.width, box.height]))).size;
}

// Native OCR and face detection report confidence only on macOS.
export const reportsConfidence = !isWindows;

export function plural(count: number, noun: string) {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export function historyLabel(offset: number) {
  if (offset === 0) return "Latest history entry";
  return offset === 1 ? "1 entry earlier" : `${offset} entries earlier`;
}

export function copiedMessage(scan: Scan) {
  const n = scan.regionCount;
  const from =
    scan.source.kind === "history" ? ` from history (${historyLabel(scan.source.offset).toLowerCase()})` : "";
  return n === 0
    ? `Copied image${from}. No details detected.`
    : `Copied image${from} with ${plural(n, "masked region")}`;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseReport(value: unknown, output: string, width: number, height: number, fromFile: boolean): Report {
  const invalid = () => new Error("The redaction helper returned an invalid result. Try scanning again.");
  if (
    !isRecord(value) ||
    value.output !== output ||
    !Array.isArray(value.hits) ||
    !Number.isSafeInteger(value.regionCount) ||
    (fromFile
      ? value.clipboardChangeCount != null
      : !Number.isSafeInteger(value.clipboardChangeCount) || (value.clipboardChangeCount as number) < 0) ||
    (value.regionCount as number) < 0 ||
    (value.regionCount as number) > value.hits.length ||
    (value.hits.length > 0 && value.regionCount === 0)
  ) {
    throw invalid();
  }
  const hits = value.hits.map((hit: unknown): Hit => {
    if (
      !isRecord(hit) ||
      !kinds.includes(hit.kind as Hit["kind"]) ||
      typeof hit.text !== "string" ||
      hit.text.trim().length === 0 ||
      !isFiniteNumber(hit.confidence) ||
      hit.confidence < 0 ||
      hit.confidence > 1 ||
      !["ocr", "face", "rule"].includes(hit.confidenceSource as string) ||
      !isRecord(hit.box)
    ) {
      throw invalid();
    }
    const { x, y, width: boxWidth, height: boxHeight } = hit.box;
    if (
      !isFiniteNumber(x) ||
      !isFiniteNumber(y) ||
      !isFiniteNumber(boxWidth) ||
      !isFiniteNumber(boxHeight) ||
      x < 0 ||
      y < 0 ||
      boxWidth <= 0 ||
      boxHeight <= 0 ||
      x + boxWidth > width ||
      y + boxHeight > height
    ) {
      throw invalid();
    }
    return {
      kind: hit.kind as Hit["kind"],
      text: hit.text,
      confidence: hit.confidence,
      confidenceSource: hit.confidenceSource as Hit["confidenceSource"],
      box: { x, y, width: boxWidth, height: boxHeight },
    };
  });
  const regions = new Set(hits.map(({ box }) => `${box.x},${box.y},${box.width},${box.height}`));
  if (regions.size !== value.regionCount) throw invalid();
  return {
    hits,
    output,
    regionCount: value.regionCount as number,
    clipboardChangeCount: fromFile ? null : (value.clipboardChangeCount as number),
  };
}

async function imageDimensions(output: string) {
  const file = await open(output, "r");
  try {
    const header = Buffer.alloc(24);
    const { bytesRead } = await file.read(header, 0, header.length, 0);
    if (
      bytesRead !== header.length ||
      !header.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) ||
      header.toString("ascii", 12, 16) !== "IHDR"
    ) {
      throw new Error("The redaction helper did not produce a PNG image. Try scanning again.");
    }
    const width = header.readUInt32BE(16);
    const height = header.readUInt32BE(20);
    if (width === 0 || height === 0) throw new Error("The redacted image is empty. Try scanning again.");
    return { width, height };
  } finally {
    await file.close();
  }
}

function isProcessAlive(pid: number) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return !(isRecord(error) && error.code === "ESRCH");
  }
}

async function cleanExpired(directory: string) {
  const entries = await readdir(directory);
  await Promise.all(
    entries.map(async (name) => {
      const location = path.join(directory, name);
      const owned = /^run-(\d+)-[A-Za-z0-9]+$/.exec(name);
      if (!owned && name !== "in.png" && name !== "out.png") return;
      try {
        const info = await lstat(location);
        if (Date.now() - info.mtimeMs < expiry) return;
        if (owned) {
          if (!info.isDirectory() || isProcessAlive(Number(owned[1]))) return;
          await rm(location, { recursive: true, force: true });
        } else if (info.isFile()) {
          await rm(location, { force: true });
        }
      } catch {
        // A simultaneous invocation may have already removed this expired result.
      }
    }),
  );
}

async function runNative<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isRecord(error) && typeof error.stderr === "string" && error.stderr.trim()) {
      throw new Error(error.stderr.trim());
    }
    throw error;
  }
}

// `changeCount` guards automatic copies of file scans, which have no clipboard generation of their own.
async function scanImage(
  source: ScanSource,
  recognitionOverride?: "fast" | "accurate",
  changeCount: number | null = null,
  forReview = false,
): Promise<Scan> {
  const prefs = getPreferenceValues<Preferences>();
  const style = prefs.style || "blackout";
  const blurFaces = prefs.blurFaces ?? false;
  const recognition = recognitionOverride || prefs.recognition || "fast";
  const padding = prefs.padding?.trim() || "4";
  const selection = (await loadCategories()).join(",");
  if (!["pixelate", "blur", "blackout"].includes(style)) throw new Error("Choose a valid Redaction Style.");
  if (!["fast", "accurate"].includes(recognition)) throw new Error("Choose Fast or Accurate Text Recognition.");
  if (!Number.isFinite(Number(padding)) || Number(padding) < 0 || Number(padding) > 1000) {
    throw new Error("Padding must be a finite number from 0 to 1000 pixels.");
  }
  const selected = selection
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const unknown = selected.filter((value) => !categories.includes(value as (typeof categories)[number]));
  if (unknown.length) throw new Error(`Unknown categories in What to Hide: ${unknown.join(", ")}.`);

  const inputPath = source.kind === "history" ? source.path : null;
  const base = path.join(tmpdir(), "hide-details");
  await mkdir(base, { recursive: true, mode: 0o700 });
  await cleanExpired(base);
  const directory = await mkdtemp(path.join(base, `run-${process.pid}-`));
  const output = path.join(directory, "out.png");
  try {
    const report = await runNative(() =>
      isWindows
        ? windows.redactImage({
            outputPath: output,
            style,
            blurFaces,
            padding: Number(padding),
            categories: new Set(selected),
            extraWords: prefs.extraWords || "",
            recognition,
            customRegex: prefs.customRegex || "",
            inputPath,
          })
        : swift().then((native) =>
            native.redactImage(
              output,
              style,
              padding,
              selection,
              prefs.extraWords || "",
              recognition,
              prefs.customRegex || "",
              inputPath,
              forReview,
              blurFaces,
            ),
          ),
    );
    const { width, height } = await imageDimensions(output);
    const parsed = parseReport(report, output, width, height, inputPath !== null);
    const reviewKey = forReview && isRecord(report) ? report.reviewKey : undefined;
    if (forReview && !isWindows && (typeof reviewKey !== "string" || Buffer.from(reviewKey, "base64").length !== 32)) {
      throw new Error("The redaction helper returned an invalid review. Try scanning again.");
    }
    const scan: Scan = {
      ...parsed,
      clipboardChangeCount: parsed.clipboardChangeCount ?? changeCount,
      hits: identifyHits(parsed.hits, randomUUID()),
      excludedIds: [],
      source,
    };
    sessions.set(scan, {
      directory,
      style,
      blurFaces,
      reviewKey: typeof reviewKey === "string" ? reviewKey : undefined,
      width,
      height,
      current: scan,
      disposed: false,
      copies: new Set(),
    });
    return scan;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

function clipboardChangeCount(): Promise<number> {
  return runNative(async () => (isWindows ? windows.clipboardChangeCount() : (await swift()).clipboardChangeCount()));
}

async function historyImageAt(offset: number): Promise<HistoryImage | null> {
  let file: string | undefined;
  try {
    file = (await Clipboard.read({ offset })).file;
  } catch {
    return null;
  }
  if (!file) return null;
  const location = file.startsWith("file://") ? fileURLToPath(file) : file;
  if (!imageExtensions.includes(path.extname(location).toLowerCase())) return null;
  try {
    const info = await stat(location);
    return info.isFile() ? { offset, path: location, modified: info.mtime } : null;
  } catch {
    // Raycast may have pruned this history entry.
    return null;
  }
}

// Lists copied image files in Raycast history, newest first. Screenshots have no file field.
export async function clipboardHistoryImageFiles(limit = historyOffsets.length): Promise<HistoryImage[]> {
  // A full listing reads every entry at once; a short lookup stops at the first images found.
  const all = limit >= historyOffsets.length ? await Promise.all(historyOffsets.map(historyImageAt)) : null;
  const images: HistoryImage[] = [];
  for (const [index, offset] of historyOffsets.entries()) {
    if (images.length >= limit) break;
    const image = all ? all[index] : await historyImageAt(offset);
    if (image && !images.some((existing) => existing.path === image.path)) images.push(image);
  }
  return images;
}

export function redactHistoryImage(
  image: HistoryImage,
  options: { recognition?: "fast" | "accurate"; forReview?: boolean } = {},
) {
  return scanImage({ kind: "history", ...image }, options.recognition, null, options.forReview);
}

export async function redactClipboard(
  options: {
    recognition?: "fast" | "accurate";
    fallbackToHistory?: boolean;
    guardClipboard?: boolean;
    forReview?: boolean;
  } = {},
): Promise<Scan> {
  if (!options.fallbackToHistory) return scanImage({ kind: "clipboard" }, options.recognition, null, options.forReview);
  // Read the generation first so an automatic copy cannot overwrite anything copied after this point.
  // Only callers that copy with requireOriginalClipboard need it.
  const changeCount = options.guardClipboard ? await clipboardChangeCount() : null;
  try {
    return await scanImage({ kind: "clipboard" }, options.recognition, null, options.forReview);
  } catch (error) {
    if (!(error instanceof Error) || !error.message.startsWith(noImageMessage)) throw error;
    const [recent] = await clipboardHistoryImageFiles(1);
    if (!recent) {
      throw new Error(
        "Clipboard has no image, and recent history has no copied image files. Screenshot history is unavailable. Copy a screenshot again or copy an image file.",
      );
    }
    return scanImage({ kind: "history", ...recent }, options.recognition, changeCount, options.forReview);
  }
}

// A pending render locks copying and further edits. The old preview remains valid if rendering fails.
export async function updateRedactions(scan: Scan, excludedIds: readonly string[]): Promise<Scan> {
  const session = sessions.get(scan);
  if (!session || session.disposed || session.current !== scan || !session.reviewKey) {
    throw new Error("This preview has expired. Scan the current clipboard again.");
  }
  if (session.pending) throw new Error("The preview is updating. Try again when it finishes.");
  const ids = new Set(excludedIds);
  if ([...ids].some((id) => !scan.hits.some((hit) => hit.id === id))) {
    throw new Error("This detection belongs to a different scan. Scan the current clipboard again.");
  }
  const included = scan.hits.filter((hit) => !ids.has(hit.id));
  const output = path.join(session.directory, `${randomUUID()}.png`);
  const render = async () => {
    try {
      const count = await runNative(() =>
        swift().then((native) =>
          native.updateReviewImage(
            path.join(session.directory, "source.sealed"),
            session.reviewKey!,
            JSON.stringify(included.map(({ kind, box }) => ({ kind, box }))),
            session.style,
            output,
            session.blurFaces,
          ),
        ),
      );
      const dimensions = await imageDimensions(output);
      if (
        count !== regionCount(included) ||
        dimensions.width !== session.width ||
        dimensions.height !== session.height
      ) {
        throw new Error("The redaction helper returned an invalid preview. Try again.");
      }
      // Copy helpers run in separate processes and may not have opened the old file yet.
      // Pending edits block new copies, so this set contains every reader to preserve.
      await Promise.allSettled(session.copies);
      if (session.disposed) throw new Error("This preview has expired. Scan the current clipboard again.");
      const next: Scan = { ...scan, output, regionCount: count, excludedIds: [...ids] };
      sessions.set(next, session);
      session.current = next;
      // A fresh filename makes Raycast refresh its image cache.
      await rm(scan.output, { force: true }).catch(() => undefined);
      return next;
    } catch (error) {
      await rm(output, { force: true }).catch(() => undefined);
      throw error;
    }
  };
  session.pending = render();
  try {
    return await session.pending;
  } finally {
    session.pending = undefined;
  }
}

export function canReview(scan: Scan) {
  const session = sessions.get(scan);
  return !!session && !session.disposed && !!session.reviewKey;
}

export async function copyRedacted(scan: Scan, options: { requireOriginalClipboard?: boolean } = {}) {
  const session = sessions.get(scan);
  if (!session || session.disposed || session.current !== scan) {
    throw new Error("This preview has expired. Scan the current clipboard again.");
  }
  if (session.pending) throw new Error("The preview is updating. Wait before copying.");
  const expected = options.requireOriginalClipboard ? scan.clipboardChangeCount : null;
  const copy = runNative(() =>
    isWindows
      ? windows.copyRedactedImage(scan.output, expected)
      : swift().then((native) => native.copyRedactedImage(scan.output, expected)),
  );
  session.copies.add(copy);
  try {
    await copy;
  } finally {
    session.copies.delete(copy);
  }
}

export async function disposeScan(scan: Scan) {
  const session = sessions.get(scan);
  if (!session || session.disposed) return;
  session.disposed = true;
  await session.pending?.catch(() => undefined);
  await Promise.allSettled(session.copies);
  session.reviewKey = undefined;
  await rm(session.directory, { recursive: true, force: true });
}
