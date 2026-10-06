import { environment, getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import { lstat, mkdir, mkdtemp, open, readdir, rm } from "fs/promises";
import { tmpdir } from "os";
import path from "path";
import { promisify } from "util";

const exec = promisify(execFile);
const categories = ["email", "phone", "card", "secret", "ip", "name", "face"] as const;
const kinds = [...categories, "custom"] as const;
const expiry = 24 * 60 * 60 * 1000;
const ownedDirectories = new WeakMap<Scan, string>();

export type Hit = {
  kind: (typeof kinds)[number];
  text: string;
  confidence: number;
  confidenceSource: "ocr" | "face" | "rule";
  box: { x: number; y: number; width: number; height: number };
};

export type Report = {
  hits: Hit[];
  regionCount: number;
  output: string;
  clipboardChangeCount: number;
};

export type Scan = Readonly<Report>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function parseReport(value: unknown, output: string, width: number, height: number): Report {
  const invalid = () => new Error("The redaction helper returned an invalid result. Try scanning again.");
  if (
    !isRecord(value) ||
    value.output !== output ||
    !Array.isArray(value.hits) ||
    !Number.isSafeInteger(value.regionCount) ||
    !Number.isSafeInteger(value.clipboardChangeCount) ||
    (value.clipboardChangeCount as number) < 0 ||
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
    clipboardChangeCount: value.clipboardChangeCount as number,
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

async function runHelper(args: string[]) {
  try {
    return await exec(path.join(environment.assetsPath, "hide-details"), args, {
      timeout: 120_000,
      maxBuffer: 8 * 1024 * 1024,
    });
  } catch (error) {
    if (isRecord(error) && typeof error.stderr === "string" && error.stderr.trim()) {
      throw new Error(error.stderr.trim());
    }
    throw error;
  }
}

export async function redactClipboard(options: { recognition?: "fast" | "accurate" } = {}): Promise<Scan> {
  const prefs = getPreferenceValues<Preferences>();
  const style = prefs.style || "blackout";
  const recognition = options.recognition || prefs.recognition || "fast";
  const padding = prefs.padding?.trim() || "4";
  const selection = prefs.categories ?? categories.join(",");
  if (!["pixelate", "blur", "blackout"].includes(style)) throw new Error("Choose a valid Redaction Style.");
  if (!["fast", "accurate"].includes(recognition)) throw new Error("Choose Fast or Accurate Text Recognition.");
  if (!Number.isFinite(Number(padding)) || Number(padding) < 0 || Number(padding) > 1000) {
    throw new Error("Padding must be a finite number from 0 to 1000 pixels.");
  }
  const unknown = selection
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value && !categories.includes(value as (typeof categories)[number]));
  if (unknown.length) throw new Error(`Unknown categories in What to Hide: ${unknown.join(", ")}.`);

  const base = path.join(tmpdir(), "hide-details");
  await mkdir(base, { recursive: true, mode: 0o700 });
  await cleanExpired(base);
  const directory = await mkdtemp(path.join(base, `run-${process.pid}-`));
  const output = path.join(directory, "out.png");
  try {
    const { stdout } = await runHelper([
      "--clipboard",
      output,
      style,
      padding,
      selection,
      prefs.extraWords || "",
      recognition,
      prefs.customRegex || "",
    ]);
    const { width, height } = await imageDimensions(output);
    const scan = parseReport(JSON.parse(stdout) as unknown, output, width, height);
    ownedDirectories.set(scan, directory);
    return scan;
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }
}

export async function copyRedacted(scan: Scan, options: { requireOriginalClipboard?: boolean } = {}) {
  if (!ownedDirectories.has(scan)) throw new Error("This preview has expired. Scan the current clipboard again.");
  const args = ["--copy-clipboard", scan.output];
  if (options.requireOriginalClipboard) args.push(String(scan.clipboardChangeCount));
  await runHelper(args);
}

export async function disposeScan(scan: Scan) {
  const directory = ownedDirectories.get(scan);
  if (!directory) return;
  ownedDirectories.delete(scan);
  await rm(directory, { recursive: true, force: true });
}
