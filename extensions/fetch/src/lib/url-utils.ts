import { spawn } from "child_process";
import { closeSync, openSync } from "fs";
import { basename, dirname, extname, join } from "path";
import { sanitizeFilename, uniquePath } from "@chrismessina/raycast-downloader/paths";
import { logDebug, logInfo, logWarn } from "./logger";

// URL extraction patterns
// The target allows one level of balanced parentheses so that links to URLs like
// `…/wiki/Foo_(bar)` capture the whole target instead of stopping at the first `)`.
const MARKDOWN_LINK_REGEX = /\[([^\]]*)\]\(((?:[^()\s]|\([^()\s]*\))+)\)/g;
// Square brackets are intentionally allowed: curl-style range patterns
// (`file[001-025].zip`) must survive extraction so `expandRangeUrl` can see them.
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`]+/g;
// Trailing characters that are almost always prose punctuation, not part of the URL.
// `)` and `]` are handled separately by `stripTrailingPunctuation` because they
// are legitimate URL characters when balanced.
const URL_TRAILING_PUNCT = /[.,;:!?'"<>)\]]$/;

/**
 * Strip trailing prose punctuation from a URL, one character at a time.
 *
 * A trailing `)` or `]` is only removed when it is *unbalanced* — otherwise it
 * belongs to the URL. This keeps `…/Foo_(bar)` and `…/file[001-025].zip` intact
 * while still trimming the `)` off `(see https://example.com/a.zip)`.
 */
function stripTrailingPunctuation(raw: string): string {
  let url = raw.trim();

  for (;;) {
    const match = url.match(URL_TRAILING_PUNCT);
    if (!match) break;

    const char = match[0];
    if (char === ")" && countChar(url, "(") >= countChar(url, ")")) break;
    if (char === "]" && countChar(url, "[") >= countChar(url, "]")) break;

    url = url.slice(0, -1);
  }

  return url;
}

function countChar(text: string, char: string): number {
  let count = 0;
  for (const c of text) {
    if (c === char) count++;
  }
  return count;
}

/**
 * Extract URLs from mixed text input — handles markdown `[text](url)` links and
 * plain URLs embedded in prose. Deduplicates by URL and strips trailing
 * punctuation that got swept up by the plain-URL regex.
 */
export function extractUrlStringsFromText(text: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const markdownRanges: { start: number; end: number }[] = [];
  let match: RegExpExecArray | null;

  // Markdown links first — they always win over plain-URL matches inside their range.
  MARKDOWN_LINK_REGEX.lastIndex = 0;
  while ((match = MARKDOWN_LINK_REGEX.exec(text)) !== null) {
    const url = match[2].trim();
    markdownRanges.push({ start: match.index, end: match.index + match[0].length });
    if (isValidUrl(url) && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  URL_REGEX.lastIndex = 0;
  while ((match = URL_REGEX.exec(text)) !== null) {
    const rawMatch = match[0];
    const url = stripTrailingPunctuation(rawMatch);
    const start = match.index;
    const end = start + rawMatch.length;

    const insideMarkdown = markdownRanges.some((md) => start >= md.start && end <= md.end);
    if (!insideMarkdown && isValidUrl(url) && !seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  logDebug("Extracted URLs from text", { count: urls.length });
  return urls;
}

// Common MIME type to file extension mapping
const MIME_TO_EXTENSION: Record<string, string> = {
  // Text
  "text/html": ".html",
  "text/plain": ".txt",
  "text/css": ".css",
  "text/javascript": ".js",
  "text/csv": ".csv",
  "text/xml": ".xml",
  "text/markdown": ".md",

  // Application
  "application/json": ".json",
  "application/javascript": ".js",
  "application/xml": ".xml",
  "application/pdf": ".pdf",
  "application/zip": ".zip",
  "application/gzip": ".gz",
  "application/x-tar": ".tar",
  "application/x-bzip2": ".bz2",
  "application/x-7z-compressed": ".7z",
  "application/x-rar-compressed": ".rar",
  "application/octet-stream": "", // Binary, no default extension
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",

  // Images
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "image/x-icon": ".ico",
  "image/bmp": ".bmp",
  "image/tiff": ".tiff",
  "image/avif": ".avif",

  // Audio
  "audio/mpeg": ".mp3",
  "audio/wav": ".wav",
  "audio/ogg": ".ogg",
  "audio/flac": ".flac",
  "audio/aac": ".aac",
  "audio/webm": ".weba",

  // Video
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/ogg": ".ogv",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/x-matroska": ".mkv",

  // Fonts
  "font/woff": ".woff",
  "font/woff2": ".woff2",
  "font/ttf": ".ttf",
  "font/otf": ".otf",
};

export interface HeadResponse {
  contentType?: string;
  contentDisposition?: string;
  contentLength?: number;
}

export async function fetchHeadInfo(url: string, timeout = 10): Promise<HeadResponse> {
  return new Promise((resolve) => {
    const args = [
      "-s", // Silent
      "-I", // HEAD request
      "-L", // Follow redirects
      "--max-time",
      timeout.toString(),
      "-w",
      "\\n%{content_type}",
      url,
    ];

    logDebug("Fetching HEAD info", { url });

    const curl = spawn("curl", args);
    let output = "";

    curl.stdout.on("data", (data: Buffer) => {
      output += data.toString();
    });

    curl.on("close", (code: number) => {
      if (code !== 0) {
        logDebug("HEAD request failed, continuing without metadata", { url, code });
        resolve({});
        return;
      }

      const result: HeadResponse = {};

      // With -L, curl prints one header block per redirect hop. We want the last block.
      // The -w suffix is appended after the final block, so split on "HTTP/" and take the last segment.
      const segments = output.split(/(?=^HTTP\/)/m);
      const finalBlock = segments.length > 0 ? segments[segments.length - 1] : output;

      // Parse Content-Disposition from final response only
      const dispositionMatch = finalBlock.match(/content-disposition:\s*(.+)/i);
      if (dispositionMatch) {
        result.contentDisposition = dispositionMatch[1].trim();
      }

      // Parse Content-Length from final response only
      const lengthMatch = finalBlock.match(/content-length:\s*(\d+)/i);
      if (lengthMatch) {
        result.contentLength = parseInt(lengthMatch[1], 10);
      }

      // Parse Content-Type from -w output (last line of overall output)
      const lines = output.trim().split("\n");
      const lastLine = lines[lines.length - 1];
      if (lastLine && !lastLine.includes(":")) {
        // This is the content_type from -w output
        result.contentType = lastLine.split(";")[0].trim();
      } else {
        // Fallback to header parsing on final block
        const typeMatch = finalBlock.match(/content-type:\s*([^;\r\n]+)/i);
        if (typeMatch) {
          result.contentType = typeMatch[1].trim();
        }
      }

      logDebug("HEAD response parsed", { url, ...result });
      resolve(result);
    });

    curl.on("error", () => {
      logDebug("HEAD request error, continuing without metadata", { url });
      resolve({});
    });
  });
}

export function getExtensionFromContentType(contentType: string): string {
  const mimeType = contentType.toLowerCase().split(";")[0].trim();
  return MIME_TO_EXTENSION[mimeType] || "";
}

export function ensureExtension(filename: string, contentType?: string): string {
  const currentExt = extname(filename);

  // If filename already has an extension, keep it
  if (currentExt && currentExt.length > 1) {
    return filename;
  }

  // Try to add extension from Content-Type
  if (!contentType) {
    return filename;
  }

  const ext = getExtensionFromContentType(contentType);
  if (!ext) {
    return filename;
  }

  logInfo("Appending extension from Content-Type", { filename, contentType, extension: ext });
  return filename + ext;
}

/**
 * Trim whitespace and trailing prose punctuation from a URL.
 * Clipboard/argument URLs often include a trailing `.` or `)` from surrounding text.
 */
export function cleanUrl(url: string): string {
  return stripTrailingPunctuation(url);
}

export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      logWarn("Invalid URL protocol", { url, protocol: parsed.protocol });
      return false;
    }
    return true;
  } catch {
    logWarn("Invalid URL format", { url });
    return false;
  }
}

/**
 * Bidirectional-text controls that `sanitizeFilename` does not remove — it strips
 * `\x00-\x1f\x7f` and `<>:"|?*`, all of which are ASCII.
 *
 * U+202E RIGHT-TO-LEFT OVERRIDE is the classic attachment spoof: a server sends
 * `\u202Efdp.exe` and Finder renders it as `exe.pdf`. Reachable only since this
 * file learned to decode non-ASCII header values at all, so it is removed here
 * rather than left for the user to notice.
 */
const BIDI_CONTROLS = /[\u061C\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

/** Every filename this module hands out goes through here. */
function safeFilename(raw: string): string {
  return sanitizeFilename(raw.replace(BIDI_CONTROLS, "").trim());
}

export function extractFilename(url: string, contentDisposition?: string): string {
  // Try Content-Disposition header first
  if (contentDisposition) {
    // RFC 5987 `filename*` wins when present — it is the one that can carry
    // non-ASCII. It is `charset'language'percent-encoded-value`, so the old
    // regex (which matched `filename*` too, stripped the apostrophes and never
    // decoded) turned `filename*=UTF-8''caf%C3%A9.pdf` into the literal
    // `UTF-8caf%C3%A9.pdf` on disk.
    const extended = contentDisposition.match(/filename\*\s*=\s*([^;\n]+)/i);
    if (extended) {
      // Split BEFORE stripping quotes. `'` is a structural delimiter here, not a
      // quote character: stripping it first turned `filename*=UTF-8''` (empty
      // value) into `UTF-8'`, which is under three parts, so the charset itself
      // became the filename — and being non-empty it beat a perfectly good plain
      // `filename` in the same header. Only a MATCHED pair of double quotes is
      // stripped, and only from the value.
      const raw = extended[1].trim().replace(/^"(.*)"$/, "$1");
      const parts = raw.split("'");
      const hasExtendedForm = parts.length >= 3;
      // The charset is the FIRST field and it is not decoration. `decodeURIComponent`
      // is UTF-8-only, so an ISO-8859-1 value like `caf%E9.pdf` — valid Latin-1,
      // invalid standalone UTF-8 — made it throw and silently fall back.
      const charset = hasExtendedForm && parts[0] ? parts[0] : "utf-8";
      const value = hasExtendedForm ? parts.slice(2).join("'") : raw;
      try {
        // Percent-decode to BYTES first, then apply the declared charset. Going
        // straight to text would re-impose UTF-8 on bytes that aren't.
        // Percent-decode to BYTES, then apply the declared charset. `latin1` maps
        // each code unit to one byte, so an unescaped char and a `%XX` escape both
        // land as themselves; `decodeURIComponent` would re-impose UTF-8 on bytes
        // that aren't, which is what made ISO-8859-1 values throw.
        const raw8 = Buffer.from(
          value.replace(/%([0-9A-Fa-f]{2})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16))),
          "latin1",
        );
        const decoded = new TextDecoder(charset, { fatal: true }).decode(raw8);
        const clean = safeFilename(decoded);
        // Gate on the SANITIZED value, not the raw one. `sanitizeFilename` collapses
        // degenerate input (".", "..", " . ") to the generic "download", and taking
        // that would discard a perfectly good plain `filename` in the same header —
        // the same "worthless value beats a valid one" shape as the empty case above.
        if (clean !== "download" || /[\p{L}\p{N}]/u.test(decoded)) {
          logDebug("Filename extracted from Content-Disposition (RFC 5987)", { filename: clean, charset });
          return clean;
        }
      } catch {
        // Unknown charset, or bytes that aren't valid in it. Fall through to `filename`.
        logWarn("Undecodable filename* in Content-Disposition", { raw, charset });
      }
    }

    // Plain `filename`. `\s*=` rather than `[^;=\n]*=` so this cannot also match
    // the `filename*` form handled above.
    const filenameMatch = contentDisposition.match(/filename\s*=\s*((['"]).*?\2|[^;\n]*)/i);
    if (filenameMatch) {
      const filename = filenameMatch[1].replace(/['"]/g, "").trim();
      if (filename) {
        logDebug("Filename extracted from Content-Disposition", { filename });
        return safeFilename(filename);
      }
    }
  }

  // Extract from URL path
  try {
    const parsed = new URL(url);
    const pathname = parsed.pathname;
    let filename = basename(pathname);

    // Remove query string if it got included
    const queryIndex = filename.indexOf("?");
    if (queryIndex > -1) {
      filename = filename.substring(0, queryIndex);
    }

    // Decode URL-encoded characters
    filename = decodeURIComponent(filename);

    // If no filename or just a slash, generate a default
    if (!filename || filename === "/" || filename === "") {
      filename = generateDefaultFilename(url);
    }

    logDebug("Filename extracted from URL", { url, filename });
    return safeFilename(filename);
  } catch {
    return safeFilename(generateDefaultFilename(url));
  }
}

function generateDefaultFilename(url: string): string {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.replace(/[^a-zA-Z0-9]/g, "_");
    const timestamp = Date.now();
    return `${hostname}_${timestamp}`;
  } catch {
    return `download_${Date.now()}`;
  }
}

/**
 * A fresh reserved path next to `outputPath`, for retrying a download whose name
 * turned out to be taken. Keeps the directory and filename, takes the next free
 * suffix.
 */
export function nextAvailablePath(outputPath: string, filename: string): string {
  return uniquePath(dirname(outputPath), filename, { reserve: true });
}

/**
 * Reserve `<direct>.part` for overwrite mode, reporting whether `direct` is usable.
 *
 * The reservation matters even in overwrite mode: without a marker on disk, a
 * sibling's `uniquePath` sees a free name and picks the same one.
 *
 * An existing partial is NOT a reason to step aside here. Overwrite means the user
 * already said to clobber this name, and if a runner really is live on it the
 * package detects that itself and fails with `conflict` plus text telling them to
 * wait or pick another destination — better than us inferring liveness from a
 * marker file that outlives a killed process.
 *
 * Every OTHER errno is a reason to step aside: ENAMETOOLONG, EACCES, ENOTDIR and
 * friends mean this path is unusable, and `uniquePath` both budgets the name length
 * and surfaces an unwritable directory as a throw the commands already handle.
 */
function reserveDirect(direct: string): boolean {
  try {
    closeSync(openSync(`${direct}.part`, "wx"));
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === "EEXIST";
  }
}

/**
 * Resolve a final output path for a URL: fetch HEAD metadata, extract a filename
 * (prefers Content-Disposition, falls back to URL path), ensure it has an extension
 * based on Content-Type, and either use the base path directly (overwrite) or
 * generate a collision-free unique path.
 *
 * `taken` is the set of paths already handed out by THIS batch. Overwrite means
 * "replace a file that existed before the batch", never "let two URLs in one batch
 * fight over one name" — and the caller resolving the batch is the only thing that
 * knows which is which. Callers add each result to it; `download` passes nothing,
 * because a single URL has no siblings.
 */
export async function resolveOutputPath(
  url: string,
  outputDirectory: string,
  overwrite: boolean,
  taken?: ReadonlySet<string>,
): Promise<{ filename: string; outputPath: string }> {
  const headInfo = await fetchHeadInfo(url);

  let filename = extractFilename(url, headInfo.contentDisposition);
  filename = ensureExtension(filename, headInfo.contentType);

  // `uniquePath({ reserve: true })` claims the slot on the FILESYSTEM by creating
  // `<path>.part`, so two concurrent callers can't be handed the same name. That
  // is also the exact file the detached runner streams into, so the reservation
  // and the download are the same artifact — nothing to release on the happy path.
  const direct = join(outputDirectory, filename);
  const outputPath =
    overwrite && !taken?.has(direct) && reserveDirect(direct)
      ? direct
      : uniquePath(outputDirectory, filename, { reserve: true });

  return { filename, outputPath };
}

// Range URL pattern support (curl-style)
// Supports [start-end] syntax, e.g., https://example.com/file[001-025].zip

export interface RangePattern {
  /** The original URL with range pattern */
  original: string;
  /** The URL template with placeholder for number substitution */
  template: string;
  /** Start number of the range */
  start: number;
  /** End number of the range */
  end: number;
  /** Number of digits for zero-padding (derived from start number format) */
  padding: number;
  /** Whether the range is descending (start > end) */
  descending: boolean;
}

export interface RangeParseResult {
  /** Whether the URL contains a valid range pattern */
  hasRange: boolean;
  /** Parsed range info (if hasRange is true) */
  range?: RangePattern;
  /** Error message if pattern is malformed */
  error?: string;
}

// Pattern regex: [start-end] where start and end are numbers (possibly zero-padded)
const RANGE_PATTERN_REGEX = /\[(\d+)-(\d+)\]/;

/**
 * Check if a URL contains a curl-style range pattern [start-end].
 */
export function hasRangePattern(url: string): boolean {
  return RANGE_PATTERN_REGEX.test(url);
}

/**
 * Parse a curl-style range pattern from a URL.
 * Supports [1-10] for plain numbers and [001-025] for zero-padded.
 * Zero-padding is auto-detected from the start number format.
 */
export function parseRangePattern(url: string): RangeParseResult {
  const match = RANGE_PATTERN_REGEX.exec(url);

  if (!match) {
    return { hasRange: false };
  }

  const startStr = match[1];
  const endStr = match[2];
  const start = parseInt(startStr, 10);
  const end = parseInt(endStr, 10);

  // Validate parsed numbers
  if (isNaN(start) || isNaN(end)) {
    return { hasRange: true, error: "Invalid numbers in range pattern" };
  }

  // Check if either number is negative (shouldn't happen with \d+ but be safe)
  if (start < 0 || end < 0) {
    return { hasRange: true, error: "Range numbers must be non-negative" };
  }

  // Detect zero-padding from the start number (e.g., "001" has padding 3)
  const padding = startStr.length > 1 && startStr.startsWith("0") ? startStr.length : 0;

  // Create template by replacing the range pattern with a placeholder
  const template = url.replace(RANGE_PATTERN_REGEX, "{{NUM}}");

  // Validate the template creates valid URLs
  const testUrl = template.replace("{{NUM}}", "1");
  if (!isValidUrl(testUrl)) {
    return { hasRange: true, error: "Pattern does not form a valid URL" };
  }

  const descending = start > end;

  logDebug("Parsed range pattern", {
    original: url,
    start,
    end,
    padding,
    descending,
    count: Math.abs(end - start) + 1,
  });

  return {
    hasRange: true,
    range: {
      original: url,
      template,
      start,
      end,
      padding,
      descending,
    },
  };
}

/**
 * Expand a URL with range pattern into an array of URLs.
 * Returns single-element array with original URL if no range pattern found.
 *
 * @param url - URL possibly containing [start-end] range pattern
 * @param maxUrls - Maximum URLs to generate (default 500)
 * @returns Array of expanded URLs, or original URL if no pattern
 */
export function expandRangeUrl(url: string, maxUrls: number = 500): string[] {
  const result = parseRangePattern(url);

  if (!result.hasRange) {
    return [url];
  }

  if (result.error || !result.range) {
    logWarn("Invalid range pattern", { url, error: result.error });
    return [url];
  }

  const { template, start, end, padding, descending } = result.range;
  const count = Math.abs(end - start) + 1;

  if (count > maxUrls) {
    logWarn("Range too large, truncating", { url, count, maxUrls });
  }

  const urls: string[] = [];
  const step = descending ? -1 : 1;
  const limit = Math.min(count, maxUrls);

  for (let i = 0; i < limit; i++) {
    const num = start + i * step;
    const numStr = padding > 0 ? String(num).padStart(padding, "0") : String(num);
    urls.push(template.replace("{{NUM}}", numStr));
  }

  logDebug("Expanded range URL", {
    original: url,
    count: urls.length,
    first: urls[0],
    last: urls[urls.length - 1],
  });

  return urls;
}

/**
 * Expand multiple URLs, handling range patterns in any of them.
 *
 * Deduplicates *after* expansion: the input list is already deduplicated as raw
 * strings, but expansion can reintroduce collisions — `file001.zip` alongside
 * `file[001-002].zip` yields `file001.zip` twice, and two items resolving to the
 * same output path race each other writing the same file.
 */
export function expandAllRangeUrls(urls: string[], maxUrlsPerRange: number = 500): string[] {
  const expanded = urls.flatMap((url) => expandRangeUrl(url, maxUrlsPerRange));
  return Array.from(new Set(expanded));
}

/**
 * Get information about a range pattern for display purposes.
 */
export function getRangeInfo(url: string): { count: number; start: number; end: number; padding: number } | null {
  const result = parseRangePattern(url);

  if (!result.hasRange || !result.range) {
    return null;
  }

  return {
    count: Math.abs(result.range.end - result.range.start) + 1,
    start: result.range.start,
    end: result.range.end,
    padding: result.range.padding,
  };
}
