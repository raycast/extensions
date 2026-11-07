import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  open,
  readdir,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { basename, extname, join } from "node:path";
import { ImageSize, imageDimensions } from "./format";

/** Enough of a PNG to read its IHDR dimensions. */
const PNG_HEADER_BYTES = 32;

/** Reads at most `limit` bytes from the start of a file. */
export async function readHead(
  path: string,
  limit: number,
): Promise<Uint8Array> {
  const handle = await open(path, "r");
  try {
    const buffer = Buffer.alloc(limit);
    const { bytesRead } = await handle.read(buffer, 0, buffer.length, 0);
    return buffer.subarray(0, bytesRead);
  } finally {
    await handle.close();
  }
}

/** Images Raycast renders directly from a file URL. */
export const NATIVE_IMAGE_EXTENSIONS = [
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
];

/** Word-processing formats that macOS can convert to plain text with textutil. */
export const RICH_TEXT_EXTENSIONS = [
  ".doc",
  ".docx",
  ".rtf",
  ".rtfd",
  ".odt",
  ".wordml",
  ".webarchive",
];

/**
 * Formats with a Quick Look thumbnail generator available on a stock Mac.
 * Anything else is skipped: qlmanage never exits for files it has no
 * generator for, and the extension would rather show nothing than wait.
 */
export const THUMBNAIL_EXTENSIONS = [
  // Documents and presentations
  ".pdf",
  ".ppt",
  ".pptx",
  ".xls",
  ".xlsx",
  ".key",
  ".pages",
  ".numbers",
  // Images Raycast cannot render itself
  ".heic",
  ".heif",
  ".tiff",
  ".tif",
  ".bmp",
  ".svg",
  ".psd",
  ".ai",
  ".eps",
  ".icns",
  ".ico",
  ".avif",
  ".jp2",
  ".raw",
  ".cr2",
  ".nef",
  ".dng",
  ".arw",
  // Video (first frame) and audio (artwork when embedded)
  ".mov",
  ".mp4",
  ".m4v",
  ".mpg",
  ".mpeg",
  ".3gp",
  ".mp3",
  ".m4a",
  ".aac",
  ".wav",
  ".aiff",
  ".aif",
  ".flac",
  ".caf",
  // Fonts
  ".ttf",
  ".otf",
  ".ttc",
  ".woff",
  ".woff2",
];

export const ARCHIVE_EXTENSIONS = [
  ".zip",
  ".jar",
  ".ipa",
  ".apk",
  ".xpi",
  ".tar",
  ".tgz",
  ".tbz",
  ".txz",
  ".gz",
  ".bz2",
  ".xz",
];

const TOOL_TIMEOUT_MS = 4000;
const TEXT_LIMIT = 16 * 1024;
const ARCHIVE_LINES = 60;
const THUMBNAIL_PIXELS = 600;

function runTool(
  command: string,
  args: string[],
  signal?: AbortSignal,
  timeout = TOOL_TIMEOUT_MS,
): Promise<string> {
  return new Promise((resolve, reject) => {
    execFile(
      command,
      args,
      { signal, timeout, killSignal: "SIGKILL", maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => (error ? reject(error) : resolve(stdout)),
    );
  });
}

export interface Thumbnail {
  path: string;
  size: ImageSize | undefined;
}

/**
 * Renders a Quick Look thumbnail into `cacheDir` and returns its path. The
 * cache key includes the file's size and mtime so edits invalidate it. Returns
 * undefined when macOS has no generator for the file or gives up within the
 * timeout.
 */
export async function quickLookThumbnail(
  path: string,
  size: number,
  mtimeMs: number,
  cacheDir: string,
  signal?: AbortSignal,
): Promise<Thumbnail | undefined> {
  const key = createHash("sha1")
    .update(`${path}\0${size}\0${mtimeMs}`)
    .digest("hex");
  const cached = join(cacheDir, `${key}.png`);
  // An empty marker remembers files macOS could not render, so reselecting
  // them does not wait for the timeout again.
  const failed = join(cacheDir, `${key}.none`);
  try {
    const header = await readHead(cached, PNG_HEADER_BYTES);
    return { path: cached, size: imageDimensions(header) };
  } catch {
    // Not cached yet.
  }
  try {
    await access(failed);
    return undefined;
  } catch {
    // Not known to fail.
  }
  const workDir = join(cacheDir, `tmp-${key}-${process.pid}`);
  await mkdir(workDir, { recursive: true });
  try {
    await runTool(
      "/usr/bin/qlmanage",
      ["-t", "-s", String(THUMBNAIL_PIXELS), "-o", workDir, path],
      signal,
    );
    const produced = join(workDir, `${basename(path)}.png`);
    let header: Uint8Array;
    try {
      header = await readHead(produced, PNG_HEADER_BYTES);
    } catch {
      await writeFile(failed, "");
      return undefined;
    }
    await rename(produced, cached);
    return { path: cached, size: imageDimensions(header) };
  } catch {
    // A cancelled request says nothing about the file; a timeout does.
    if (!signal?.aborted) await writeFile(failed, "").catch(() => undefined);
    return undefined;
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

const ICON_PIXELS = 256;
// JavaScript for Automation: the same icon Finder shows, rendered to a PNG.
const ICON_SCRIPT = `
ObjC.import("Cocoa");
function run(argv) {
  const [path, out, sizeArg] = argv;
  const size = Number(sizeArg);
  const icon = $.NSWorkspace.sharedWorkspace.iconForFile(path);
  icon.size = $.NSMakeSize(size, size);
  const image = $.NSImage.alloc.initWithSize($.NSMakeSize(size, size));
  image.lockFocus;
  icon.drawInRectFromRectOperationFraction(
    $.NSMakeRect(0, 0, size, size), $.NSZeroRect,
    $.NSCompositingOperationSourceOver, 1);
  image.unlockFocus;
  const rep = $.NSBitmapImageRep.imageRepWithData(image.TIFFRepresentation);
  const png = rep.representationUsingTypeProperties($.NSBitmapImageFileTypePNG, $());
  return png.writeToFileAtomically(out, true) ? "ok" : "fail";
}`;

/**
 * The Finder icon for a file, folder, or application as a cached PNG. Plain
 * files share one icon per extension; folders, bundles, and extensionless
 * files are keyed by path and modification time.
 */
export async function fileIcon(
  path: string,
  isDirectory: boolean,
  mtimeMs: number,
  cacheDir: string,
  signal?: AbortSignal,
): Promise<Thumbnail | undefined> {
  const extension = extname(path).toLowerCase();
  const identity =
    !isDirectory && extension && extension !== ".app"
      ? `ext\0${extension}`
      : `path\0${path}\0${mtimeMs}`;
  const key = createHash("sha1").update(identity).digest("hex");
  const cached = join(cacheDir, `icon-${key}.png`);
  try {
    const header = await readHead(cached, PNG_HEADER_BYTES);
    return { path: cached, size: imageDimensions(header) };
  } catch {
    // Not cached yet.
  }
  const temporary = `${cached}.${process.pid}.tmp`;
  try {
    const output = await runTool(
      "/usr/bin/osascript",
      [
        "-l",
        "JavaScript",
        "-e",
        ICON_SCRIPT,
        path,
        temporary,
        String(ICON_PIXELS),
      ],
      signal,
    );
    if (!output.trim().endsWith("ok")) return undefined;
    const header = await readHead(temporary, PNG_HEADER_BYTES);
    await rename(temporary, cached);
    return { path: cached, size: imageDimensions(header) };
  } catch {
    await rm(temporary, { force: true });
    return undefined;
  }
}

/** Plain text of a Word, RTF, or OpenDocument file, limited to `TEXT_LIMIT` characters. */
export async function richTextContent(
  path: string,
  signal?: AbortSignal,
): Promise<{ text: string; truncated: boolean } | undefined> {
  try {
    const output = await runTool(
      "/usr/bin/textutil",
      ["-stdout", "-convert", "txt", path],
      signal,
    );
    const text = output
      .replace(/\r\n?/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
    if (!text) return undefined;
    return {
      text: text.slice(0, TEXT_LIMIT),
      truncated: text.length > TEXT_LIMIT,
    };
  } catch {
    return undefined;
  }
}

/** Entry listing of a zip or tar archive, limited to `ARCHIVE_LINES` entries. */
export async function archiveListing(
  path: string,
  signal?: AbortSignal,
): Promise<{ entries: string[]; total: number } | undefined> {
  const extension = extname(path).toLowerCase();
  const zipLike = [".zip", ".jar", ".ipa", ".apk", ".xpi"].includes(extension);
  try {
    const output = zipLike
      ? await runTool("/usr/bin/unzip", ["-Z1", path], signal)
      : await runTool("/usr/bin/tar", ["-tf", path], signal);
    const lines = output
      .split("\n")
      .filter(
        (line) =>
          line &&
          !line.includes("__MACOSX/") &&
          !basename(line).startsWith("._"),
      );
    if (lines.length === 0) return undefined;
    return {
      entries: lines.slice(0, ARCHIVE_LINES),
      total: lines.length,
    };
  } catch {
    return undefined;
  }
}

/** Pretty-printed contents of a binary or XML property list. */
export async function plistContent(
  path: string,
  signal?: AbortSignal,
): Promise<string | undefined> {
  try {
    const output = await runTool("/usr/bin/plutil", ["-p", path], signal);
    return output.trim() ? output.slice(0, TEXT_LIMIT) : undefined;
  } catch {
    return undefined;
  }
}

/** Parses `mdls` output into values; array values keep one entry per line. */
export function parseSpotlight(output: string): Map<string, string[]> {
  const values = new Map<string, string[]>();
  let array: string | undefined;
  for (const raw of output.split("\n")) {
    const line = raw.trim();
    if (array !== undefined) {
      if (line === ")") array = undefined;
      else
        values.get(array)?.push(line.replace(/,$/, "").replace(/^"|"$/g, ""));
      continue;
    }
    const match = line.match(/^(\w+)\s+=\s+(.*)$/);
    if (!match || match[2] === "(null)") continue;
    if (match[2] === "(") {
      array = match[1];
      values.set(array, []);
    } else {
      values.set(match[1], [match[2].replace(/^"|"$/g, "")]);
    }
  }
  return values;
}

export interface SpotlightDetails {
  /** Version, page count, duration, pixel size, title, download source. */
  details?: string;
  /** Finder tags with the color Finder shows them in. */
  tags: FinderTag[];
}

export interface FinderTag {
  name: string;
  color: TagColor;
}

/** Finder's tag palette, indexed as in the `_kMDItemUserTags` attribute. */
export type TagColor =
  "gray" | "green" | "purple" | "blue" | "yellow" | "red" | "orange";

const TAG_COLORS: (TagColor | undefined)[] = [
  undefined,
  "gray",
  "green",
  "purple",
  "blue",
  "yellow",
  "red",
  "orange",
];

/**
 * Finder colors a tag by its stored color index, except that files tagged
 * through iCloud or older tools often carry index 1 for every color, and
 * Finder then falls back to the built-in tag names. Do the same: a built-in
 * name wins, then the stored index, then gray.
 */
export function finderTags(
  names: string[],
  stored: Map<string, number>,
): FinderTag[] {
  return names.map((name) => {
    const builtIn = TAG_COLORS.find((color) => color === name.toLowerCase());
    const index = stored.get(name);
    const color =
      builtIn ?? (index && index > 1 ? TAG_COLORS[index] : undefined) ?? "gray";
    return { name, color };
  });
}

/** Parses the `_kMDItemUserTags` entries, each "Name\n<color index>". */
export function parseTagAttribute(json: string): Map<string, number> {
  const stored = new Map<string, number>();
  try {
    const entries: unknown = JSON.parse(json);
    if (!Array.isArray(entries)) return stored;
    for (const entry of entries) {
      if (typeof entry !== "string") continue;
      const [name, index] = entry.split("\n");
      stored.set(name, Number(index) || 0);
    }
  } catch {
    // Not JSON: treat as untagged.
  }
  return stored;
}

/** The stored color index per tag, read from the extended attribute. */
async function storedTagColors(
  path: string,
  signal?: AbortSignal,
): Promise<Map<string, number>> {
  try {
    const json = await runTool(
      "/bin/sh",
      [
        "-c",
        'xattr -px com.apple.metadata:_kMDItemUserTags "$1" | xxd -r -p | plutil -convert json -o - -',
        "sh",
        path,
      ],
      signal,
    );
    return parseTagAttribute(json);
  } catch {
    return new Map();
  }
}

/** Short facts Spotlight keeps about a file, folder, or application. */
export async function spotlightDetails(
  path: string,
  signal?: AbortSignal,
): Promise<SpotlightDetails> {
  try {
    const names = [
      "kMDItemVersion",
      "kMDItemNumberOfPages",
      "kMDItemDurationSeconds",
      "kMDItemPixelWidth",
      "kMDItemPixelHeight",
      "kMDItemTitle",
      "kMDItemWhereFroms",
      "kMDItemUserTags",
    ];
    const output = await runTool(
      "/usr/bin/mdls",
      [...names.flatMap((name) => ["-name", name]), path],
      signal,
    );
    const values = parseSpotlight(output);
    const first = (name: string) => values.get(name)?.[0];
    const parts: string[] = [];
    const version = first("kMDItemVersion");
    if (version && extname(path).toLowerCase() === ".app") parts.push(version);
    const pages = Number(first("kMDItemNumberOfPages"));
    if (pages > 0) parts.push(`${pages} ${pages === 1 ? "page" : "pages"}`);
    const seconds = Number(first("kMDItemDurationSeconds"));
    if (seconds > 0) parts.push(formatClock(seconds));
    const width = Number(first("kMDItemPixelWidth"));
    const height = Number(first("kMDItemPixelHeight"));
    if (width > 0 && height > 0) parts.push(`${width} × ${height}`);
    const title = first("kMDItemTitle")?.trim();
    if (title && title !== basename(path)) parts.push(title);
    const source = downloadHost(first("kMDItemWhereFroms"));
    if (source) parts.push(`from ${source}`);
    const tagNames = values.get("kMDItemUserTags") ?? [];
    // The attribute read is only needed for custom tag names.
    const stored = tagNames.every((name) =>
      TAG_COLORS.includes(name.toLowerCase() as TagColor),
    )
      ? new Map<string, number>()
      : await storedTagColors(path, signal);
    return {
      details: parts.length ? parts.join(" · ") : undefined,
      tags: finderTags(tagNames, stored),
    };
  } catch {
    return { tags: [] };
  }
}

/** The host a downloaded file came from, without a `www.` prefix. */
export function downloadHost(url: string | undefined): string | undefined {
  if (!url) return undefined;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    return host || undefined;
  } catch {
    return undefined;
  }
}

/** The folder's item count as Finder reports it, with hidden entries left out. */
export async function folderDetails(path: string): Promise<string | undefined> {
  try {
    const count = (await readdir(path)).filter(
      (name) => !name.startsWith("."),
    ).length;
    return count === 0 ? "Empty" : `${count} ${count === 1 ? "item" : "items"}`;
  } catch {
    return undefined;
  }
}

export function formatClock(totalSeconds: number): string {
  const seconds = Math.round(totalSeconds);
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}
