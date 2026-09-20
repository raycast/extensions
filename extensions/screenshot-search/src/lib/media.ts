import { LocalStorage } from "@raycast/api";
import { execFile, execFileSync } from "node:child_process";
import { promisify } from "node:util";
import { type Dirent, existsSync as fileExists, promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";

const execFileAsync = promisify(execFile) as (
  file: string,
  args: string[],
  options?: {
    encoding?: BufferEncoding;
    timeout?: number;
    maxBuffer?: number;
    signal?: AbortSignal;
  },
) => Promise<{ stdout: string; stderr: string }>;

const CUSTOM_SCOPES_KEY = "custom-search-scopes";
const OCR_CACHE_KEY = "ocr-cache-v1";
const PINNED_ITEMS_KEY = "pinned-items-v1";
const IMAGE_EXTENSIONS = new Set([
  ".avif",
  ".bmp",
  ".gif",
  ".heic",
  ".heif",
  ".jpeg",
  ".jpg",
  ".png",
  ".tif",
  ".tiff",
  ".webp",
]);
const VIDEO_EXTENSIONS = new Set([".m4v", ".mov", ".mp4", ".webm"]);
const MAX_OCR_CONCURRENCY = 4;
// ponytail: bounded fallback walk; indexed macOS scopes avoid this ceiling.
const MAX_SCAN_DEPTH = 8;
const MAX_SCAN_ENTRIES_PER_SCOPE = 10_000;
const SPOTLIGHT_MEDIA_QUERY = `(${[...IMAGE_EXTENSIONS, ...VIDEO_EXTENSIONS]
  .map((extension) => `kMDItemFSName == "*${extension}"cd`)
  .join(" || ")})`;
const SPOTLIGHT_SCAN_TIMEOUT = 10_000;

export type RecognitionMode = "fast" | "accurate";

export type ScreenshotPreferences = Preferences.SearchScreenshots;

export type MediaItem = {
  id: string;
  path: string;
  name: string;
  kind: "image" | "video";
  capturedAt: number;
  modifiedAt: number;
  size: number;
  text?: string;
};

export type OcrRecord = {
  text: string;
  modifiedAt: number;
  indexedAt: number;
  mode: RecognitionMode;
};

export type OcrCache = Record<string, OcrRecord>;

export async function loadMediaItems(
  preferences: ScreenshotPreferences,
): Promise<MediaItem[]> {
  const scopes = await getSearchScopes(preferences);
  const items: MediaItem[] = [];
  const seen = new Set<string>();

  for (const scope of scopes) {
    const indexed = await scanIndexedDirectory(
      scope,
      Boolean(preferences.includeAllMedia),
      items,
      seen,
    );
    if (indexed) continue;

    await scanDirectory(
      scope,
      Boolean(preferences.includeAllMedia),
      items,
      seen,
      false,
      0,
      { remainingEntries: MAX_SCAN_ENTRIES_PER_SCOPE },
    );
  }

  return items.sort(
    (a, b) => b.capturedAt - a.capturedAt || a.name.localeCompare(b.name),
  );
}

export async function getSearchScopes(
  preferences: ScreenshotPreferences,
): Promise<string[]> {
  const configured = parseScopeFolders(preferences.scopeFolders);
  const custom = await readCustomScopes();
  const candidates = [
    systemScreenshotFolder(),
    cleanShotFolder(),
    path.join(os.homedir(), "Desktop"),
    ...configured,
    ...custom,
  ];
  const scopes: string[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    if (!candidate) continue;
    const resolved = path.resolve(expandHome(candidate));
    if (seen.has(resolved)) continue;
    seen.add(resolved);

    try {
      if ((await fs.stat(resolved)).isDirectory()) scopes.push(resolved);
    } catch {
      // A watched folder can be offline or deleted; ignore it until it returns.
    }
  }

  return scopes;
}

export async function addCustomScope(folder: string): Promise<void> {
  const scopes = await readCustomScopes();
  const resolved = path.resolve(expandHome(folder));
  if (!scopes.includes(resolved)) {
    await LocalStorage.setItem(
      CUSTOM_SCOPES_KEY,
      JSON.stringify([...scopes, resolved]),
    );
  }
}

export async function readPinnedPaths(): Promise<Set<string>> {
  try {
    const value = await LocalStorage.getItem<string>(PINNED_ITEMS_KEY);
    if (!value) return new Set();
    const parsed = JSON.parse(value);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === "string")
        : [],
    );
  } catch {
    return new Set();
  }
}

export async function writePinnedPaths(paths: Set<string>): Promise<void> {
  await LocalStorage.setItem(PINNED_ITEMS_KEY, JSON.stringify([...paths]));
}

export async function chooseFolder(): Promise<string | undefined> {
  if (process.platform !== "darwin") return undefined;

  try {
    const { stdout } = await execFileAsync(
      "/usr/bin/osascript",
      [
        "-e",
        'POSIX path of (choose folder with prompt "Add a screenshot search scope")',
      ],
      { encoding: "utf8", timeout: 60_000 },
    );
    return stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function readOcrCache(): Promise<OcrCache> {
  try {
    const value = await LocalStorage.getItem<string>(OCR_CACHE_KEY);
    if (!value) return {};
    const parsed = JSON.parse(value) as OcrCache;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export async function writeOcrCache(cache: OcrCache): Promise<void> {
  await LocalStorage.setItem(OCR_CACHE_KEY, JSON.stringify(cache));
}

export function pruneOcrCache(
  cache: OcrCache,
  storageDuration: string | undefined,
  pinned: Set<string>,
): OcrCache {
  const retention = retentionMilliseconds(storageDuration);
  if (!retention) return cache;

  const cutoff = Date.now() - retention;
  return Object.fromEntries(
    Object.entries(cache).filter(
      ([filePath, record]) =>
        pinned.has(filePath) || record.indexedAt >= cutoff,
    ),
  );
}

export async function enrichWithText(
  items: MediaItem[],
  preferences: ScreenshotPreferences,
  cache: OcrCache,
  signal?: AbortSignal,
): Promise<{ items: MediaItem[]; cache: OcrCache }> {
  if (!preferences.textRecognition) return { items, cache };

  const nextCache: OcrCache = { ...cache };
  const enriched = items.map((item) => ({ ...item }));
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < enriched.length) {
      throwIfAborted(signal);
      const index = cursor++;
      const item = enriched[index];
      const cached = nextCache[item.path];
      const modifiedAt = Math.trunc(item.modifiedAt);

      if (
        cached &&
        cached.modifiedAt === modifiedAt &&
        cached.mode === (preferences.recognitionMode ?? "fast")
      ) {
        item.text = cached.text;
        continue;
      }

      if (
        (await isCloudOnly(item.path, signal)) &&
        !preferences.allowCloudFiles
      )
        continue;

      const text = await recognizeText(
        item,
        preferences.recognitionMode ?? "fast",
        signal,
      );
      throwIfAborted(signal);
      item.text = text;
      nextCache[item.path] = {
        text,
        modifiedAt,
        indexedAt: Date.now(),
        mode: preferences.recognitionMode ?? "fast",
      };
    }
  }

  const workers = Math.min(MAX_OCR_CONCURRENCY, enriched.length);
  await Promise.all(Array.from({ length: workers }, () => worker()));
  return { items: enriched, cache: nextCache };
}

export function formatMediaDate(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(timestamp);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 0; value >= 1024 && index < units.length - 1; index += 1) {
    value /= 1024;
    unit = units[index + 1];
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${unit}`;
}

type ScanBudget = { remainingEntries: number };

async function scanIndexedDirectory(
  directory: string,
  includeAllMedia: boolean,
  items: MediaItem[],
  seen: Set<string>,
): Promise<boolean> {
  if (process.platform !== "darwin") return false;

  let stdout: string;
  try {
    ({ stdout } = await execFileAsync(
      "/usr/bin/mdfind",
      ["-onlyin", directory, SPOTLIGHT_MEDIA_QUERY],
      {
        encoding: "utf8",
        timeout: SPOTLIGHT_SCAN_TIMEOUT,
        maxBuffer: 16 * 1024 * 1024,
      },
    ));
  } catch {
    return false;
  }

  const paths = stdout
    .split(/\r?\n/)
    .map((filePath) => filePath.trim())
    .filter(Boolean);
  if (paths.length === 0) return false;

  for (const filePath of paths) {
    await addMediaItem(
      filePath,
      includeAllMedia,
      isCapturePath(filePath, directory),
      items,
      seen,
    );
  }
  return true;
}

async function scanDirectory(
  directory: string,
  includeAllMedia: boolean,
  items: MediaItem[],
  seen: Set<string>,
  captureScope: boolean,
  depth: number,
  budget: ScanBudget,
): Promise<void> {
  if (depth > MAX_SCAN_DEPTH || budget.remainingEntries <= 0) return;
  const isCaptureScope = captureScope || looksLikeCaptureFolder(directory);
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort(compareScanEntries);
  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;
    if (budget.remainingEntries-- <= 0) return;
    const filePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      await scanDirectory(
        filePath,
        includeAllMedia,
        items,
        seen,
        isCaptureScope,
        depth + 1,
        budget,
      );
      continue;
    }
    if (!entry.isFile()) continue;

    await addMediaItem(filePath, includeAllMedia, isCaptureScope, items, seen);
  }
}

async function addMediaItem(
  filePath: string,
  includeAllMedia: boolean,
  captureScope: boolean,
  items: MediaItem[],
  seen: Set<string>,
): Promise<void> {
  const name = path.basename(filePath);
  const extension = path.extname(name).toLocaleLowerCase();
  const kind = IMAGE_EXTENSIONS.has(extension)
    ? "image"
    : VIDEO_EXTENSIONS.has(extension)
      ? "video"
      : undefined;
  if (!kind || (!includeAllMedia && !captureScope && !looksLikeCapture(name)))
    return;

  const resolved = path.resolve(filePath);
  if (seen.has(resolved)) return;

  try {
    const stats = await fs.stat(resolved);
    if (!stats.isFile()) return;
    seen.add(resolved);
    items.push({
      id: resolved,
      path: resolved,
      name,
      kind,
      capturedAt: stats.birthtimeMs || stats.mtimeMs,
      modifiedAt: stats.mtimeMs,
      size: stats.size,
    });
  } catch {
    // Files can disappear while a screenshot folder is being scanned.
  }
}

function compareScanEntries(a: Dirent, b: Dirent): number {
  const priority = (entry: Dirent): number => {
    if (entry.isFile() && looksLikeCapture(entry.name)) return 0;
    if (entry.isDirectory() && looksLikeCaptureFolder(entry.name)) return 1;
    return entry.isFile() ? 2 : 3;
  };

  const difference = priority(a) - priority(b);
  if (difference !== 0) return difference;
  return priority(a) < 2
    ? b.name.localeCompare(a.name, undefined, { numeric: true })
    : a.name.localeCompare(b.name, undefined, { numeric: true });
}

function isCapturePath(filePath: string, scopeDirectory: string): boolean {
  const scope = path.resolve(scopeDirectory);
  let current = path.dirname(path.resolve(filePath));

  while (true) {
    if (looksLikeCaptureFolder(current)) return true;
    if (current === scope || !current.startsWith(`${scope}${path.sep}`))
      return false;
    current = path.dirname(current);
  }
}

function looksLikeCapture(fileName: string): boolean {
  const name = fileName.normalize("NFD").toLocaleLowerCase();
  return /screenshot|screen[ _-]?shot|screen[ _-]?record|screencapture|screen.?recording|スクリーンショット|bildschirmfoto|bildschirmaufnahme|capture d.?écran|enregistrement de l.?écran|captura de pantalla|schermata|截屏|截图/.test(
    name,
  );
}

function looksLikeCaptureFolder(folderPath: string): boolean {
  return /clean.?shot|screenshot|screen[ _-]?shot|screen[ _-]?record|screen_shot|captures?/i.test(
    path.basename(folderPath),
  );
}

function parseScopeFolders(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[\r\n,]+/)
    .map((folder) => folder.trim())
    .filter(Boolean);
}

function expandHome(value: string): string {
  if (value === "~") return os.homedir();
  if (value.startsWith("~/")) return path.join(os.homedir(), value.slice(2));
  return value.replace(/^\$HOME(?=\/|$)/, os.homedir());
}

function systemScreenshotFolder(): string | undefined {
  const value = readDefault("com.apple.screencapture", "location");
  return value && !value.startsWith("Error") ? value : undefined;
}

function cleanShotFolder(): string | undefined {
  for (const key of [
    "saveFolder",
    "savePath",
    "folderPath",
    "destinationFolder",
  ]) {
    const value = readDefault("com.getcleanshot.app", key);
    if (value && !value.startsWith("Error")) return value;
  }

  const fallback = path.join(os.homedir(), "Pictures", "CleanShot");
  return fileExists(fallback) ? fallback : undefined;
}

function readDefault(domain: string, key: string): string | undefined {
  if (process.platform !== "darwin") return undefined;
  try {
    return execFileSync("/usr/bin/defaults", ["read", domain, key], {
      encoding: "utf8",
      timeout: 1_500,
    }).trim();
  } catch {
    return undefined;
  }
}

async function readCustomScopes(): Promise<string[]> {
  try {
    const value = await LocalStorage.getItem<string>(CUSTOM_SCOPES_KEY);
    if (!value) return [];
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

async function isCloudOnly(
  filePath: string,
  signal?: AbortSignal,
): Promise<boolean> {
  if (process.platform !== "darwin") return false;
  const ubiquitous = await runCommand(
    "/usr/bin/mdls",
    ["-raw", "-name", "kMDItemFSIsUbiquitous", filePath],
    1_500,
    signal,
  );
  if (ubiquitous !== "1") return false;
  const downloaded = await runCommand(
    "/usr/bin/mdls",
    ["-raw", "-name", "kMDItemFSIsDownloaded", filePath],
    1_500,
    signal,
  );
  return downloaded === "0";
}

async function recognizeText(
  item: MediaItem,
  mode: RecognitionMode,
  signal?: AbortSignal,
): Promise<string> {
  const spotlight = await runCommand(
    "/usr/bin/mdls",
    ["-raw", "-name", "kMDItemTextContent", item.path],
    4_000,
    signal,
  );
  if (mode === "fast" || item.kind === "video") return cleanText(spotlight);

  const vision = await runVisionOcr(item.path, signal);
  return cleanText(vision || spotlight);
}

async function runVisionOcr(
  filePath: string,
  signal?: AbortSignal,
): Promise<string> {
  if (process.platform !== "darwin") return "";

  const script = `
import Foundation
import Vision

let imageURL = URL(fileURLWithPath: CommandLine.arguments[1])
var recognized = [String]()
let request = VNRecognizeTextRequest { request, _ in
  guard let observations = request.results as? [VNRecognizedTextObservation] else { return }
  recognized = observations.compactMap { $0.topCandidates(1).first?.string }
}
request.recognitionLevel = .accurate
request.usesLanguageCorrection = true
let handler = VNImageRequestHandler(url: imageURL, options: [:])
try? handler.perform([request])
print(recognized.joined(separator: "\\n"))
`;

  return runCommand("/usr/bin/swift", ["-e", script, filePath], 20_000, signal);
}

async function runCommand(
  command: string,
  args: string[],
  timeout: number,
  signal?: AbortSignal,
): Promise<string> {
  try {
    throwIfAborted(signal);
    const { stdout } = await execFileAsync(command, args, {
      encoding: "utf8",
      timeout,
      maxBuffer: 2 * 1024 * 1024,
      signal,
    });
    return stdout.trim();
  } catch (error) {
    if (signal?.aborted) throw error;
    return "";
  }
}

function throwIfAborted(signal?: AbortSignal): void {
  if (!signal?.aborted) return;
  const error = new Error("Operation aborted");
  error.name = "AbortError";
  throw error;
}

function cleanText(value: string): string {
  if (!value || value === "(null)" || value === "null") return "";
  return value.replace(/^\(|\)$/g, "").trim();
}

function retentionMilliseconds(value: string | undefined): number | undefined {
  if (!value || value === "unlimited") return undefined;
  const amount = value[0] === "1" ? 1 : Number.parseInt(value, 10);
  const unit = value.endsWith("d")
    ? 1
    : value.endsWith("w")
      ? 7
      : value.endsWith("m")
        ? 30
        : 365;
  return amount * unit * 24 * 60 * 60 * 1000;
}
