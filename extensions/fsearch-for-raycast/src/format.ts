import { homedir } from "node:os";
import { extname } from "node:path";
import { PROTECTED_FOLDERS } from "./fsearch";

/** Shortens paths inside the home folder to `~/…` for display. */
export function displayPath(path: string): string {
  const home = homedir();
  if (path === home) return "~";
  return path.startsWith(home + "/") ? "~" + path.slice(home.length) : path;
}

/** Human-readable size: `512 B`, `12 KB`, `3.4 MB`, `1.2 GB`. */
export function formatSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 ** 3) return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  return `${(bytes / 1024 ** 3).toFixed(1)} GB`;
}

/** Converts fsearch's `took_us` into a short latency label. */
export function formatDuration(microseconds: number): string {
  if (microseconds < 1000) return "<1 ms";
  if (microseconds < 1_000_000) return `${Math.round(microseconds / 1000)} ms`;
  return `${(microseconds / 1_000_000).toFixed(1)} s`;
}

/** Describes a result's kind for the metadata pane and list accessories. */
export function describeKind(path: string, kind: string): string {
  const extension = extname(path).toLowerCase();
  if (kind === "dir") {
    return extension === ".app" ? "Application" : "Folder";
  }
  if (kind === "link") return "Symbolic Link";
  if (extension.length > 1 && extension.length <= 8) {
    return `${extension.slice(1).toUpperCase()} File`;
  }
  return "File";
}

/** True when the path is inside a folder that macOS gates behind Full Disk Access. */
export function isProtectedPath(path: string): boolean {
  const home = homedir();
  return [...PROTECTED_FOLDERS, "Library"].some((folder) => {
    const protectedRoot = `${home}/${folder}`;
    return path === protectedRoot || path.startsWith(protectedRoot + "/");
  });
}

/**
 * Wraps text in a fenced code block that cannot be broken by backticks in the
 * content: the fence is always one backtick longer than the longest run inside.
 */
export function codeBlock(text: string, language = ""): string {
  const longestRun = Math.max(
    2,
    ...Array.from(text.matchAll(/`+/g), (match) => match[0].length),
  );
  const fence = "`".repeat(longestRun + 1);
  const safeLanguage = /^[a-z0-9+#-]{1,20}$/i.test(language) ? language : "";
  return `${fence}${safeLanguage}\n${text.replace(/\n$/, "")}\n${fence}`;
}

/**
 * Decodes the first bytes of a file as UTF-8 text, or returns undefined when the
 * sample looks binary. A sample cut mid-character at the read boundary is still
 * accepted when more bytes remain in the file.
 */
export function decodeTextSample(
  sample: Uint8Array,
  truncated: boolean,
): string | undefined {
  if (sample.includes(0)) return undefined;
  let text: string;
  try {
    // `stream` keeps an incomplete trailing sequence out of the result instead of throwing.
    text = new TextDecoder("utf-8", { fatal: true }).decode(sample, {
      stream: truncated,
    });
  } catch {
    return undefined;
  }
  // Allow tab, newline, vertical tab, form feed, and carriage return; reject other control codes.
  // eslint-disable-next-line no-control-regex
  if (/[\u0001-\u0008\u000E-\u001F]/.test(text)) return undefined;
  return text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
}

export interface ImageSize {
  width: number;
  height: number;
}

function u16be(bytes: Uint8Array, offset: number) {
  return (bytes[offset] << 8) | bytes[offset + 1];
}
function u32be(bytes: Uint8Array, offset: number) {
  return (
    ((bytes[offset] << 24) >>> 0) +
    (bytes[offset + 1] << 16) +
    (bytes[offset + 2] << 8) +
    bytes[offset + 3]
  );
}
function u16le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}
function u24le(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16);
}

/** Reads pixel dimensions from the header bytes of a PNG, GIF, JPEG, or WebP file. */
export function imageDimensions(bytes: Uint8Array): ImageSize | undefined {
  if (bytes.length < 10) return undefined;
  const ascii = (offset: number, length: number) =>
    String.fromCharCode(...bytes.subarray(offset, offset + length));
  // PNG: 8-byte signature, then the IHDR chunk with width and height.
  if (
    bytes.length >= 24 &&
    bytes[0] === 0x89 &&
    ascii(1, 3) === "PNG" &&
    ascii(12, 4) === "IHDR"
  ) {
    return { width: u32be(bytes, 16), height: u32be(bytes, 20) };
  }
  // GIF: logical screen size follows the 6-byte header.
  if (ascii(0, 3) === "GIF") {
    return { width: u16le(bytes, 6), height: u16le(bytes, 8) };
  }
  // WebP: RIFF container with a VP8, VP8L, or VP8X chunk.
  if (bytes.length >= 30 && ascii(0, 4) === "RIFF" && ascii(8, 4) === "WEBP") {
    const chunk = ascii(12, 4);
    if (chunk === "VP8 ") {
      return {
        width: u16le(bytes, 26) & 0x3fff,
        height: u16le(bytes, 28) & 0x3fff,
      };
    }
    if (chunk === "VP8L") {
      const b0 = bytes[21];
      const b1 = bytes[22];
      const b2 = bytes[23];
      const b3 = bytes[24];
      return {
        width: 1 + (((b1 & 0x3f) << 8) | b0),
        height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
      };
    }
    if (chunk === "VP8X") {
      return { width: 1 + u24le(bytes, 24), height: 1 + u24le(bytes, 27) };
    }
    return undefined;
  }
  // JPEG: walk the marker segments until a start-of-frame marker.
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < bytes.length) {
      if (bytes[offset] !== 0xff) {
        offset += 1;
        continue;
      }
      const marker = bytes[offset + 1];
      if (marker === 0xff) {
        offset += 1;
        continue;
      }
      if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7)) {
        offset += 2;
        continue;
      }
      if (marker === 0xd9 || marker === 0xda) break;
      const length = u16be(bytes, offset + 2);
      const isStartOfFrame =
        marker >= 0xc0 &&
        marker <= 0xcf &&
        marker !== 0xc4 &&
        marker !== 0xc8 &&
        marker !== 0xcc;
      if (isStartOfFrame) {
        return {
          height: u16be(bytes, offset + 5),
          width: u16be(bytes, offset + 7),
        };
      }
      if (length < 2) break;
      offset += 2 + length;
    }
  }
  return undefined;
}

/**
 * Size, in points, that lets an image fit inside the detail pane's preview box
 * while keeping its aspect ratio. Raycast clips rather than scales when only
 * one dimension is given, so both are always passed. Small images are not
 * enlarged. Unknown sizes fall back to the full box width.
 */
export function fitPreviewSize(
  size: ImageSize | undefined,
  maxWidth = 280,
  maxHeight = 150,
): ImageSize {
  if (!size || size.width <= 0 || size.height <= 0) {
    return { width: maxWidth, height: maxHeight };
  }
  const scale = Math.min(maxWidth / size.width, maxHeight / size.height, 1);
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  };
}

/** Maps a file extension to a Markdown fence language for syntax highlighting. */
export function languageFor(path: string): string {
  const extension = extname(path).toLowerCase().slice(1);
  const aliases: Record<string, string> = {
    js: "javascript",
    mjs: "javascript",
    cjs: "javascript",
    jsx: "jsx",
    ts: "typescript",
    mts: "typescript",
    cts: "typescript",
    tsx: "tsx",
    py: "python",
    rb: "ruby",
    rs: "rust",
    sh: "bash",
    zsh: "bash",
    bash: "bash",
    yml: "yaml",
    yaml: "yaml",
    json: "json",
    md: "markdown",
    html: "html",
    htm: "html",
    css: "css",
    scss: "scss",
    swift: "swift",
    kt: "kotlin",
    go: "go",
    java: "java",
    c: "c",
    h: "c",
    cpp: "cpp",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    sql: "sql",
    toml: "toml",
    xml: "xml",
    plist: "xml",
    lua: "lua",
    dart: "dart",
  };
  return aliases[extension] ?? "";
}

/**
 * Translates shell-style wildcards into fsearch syntax. fsearch matches `*`
 * and `?` literally, so `*.docx` finds nothing; it becomes `ext:docx`, and
 * `report*.pdf` becomes `report ext:pdf`. Wildcards elsewhere are dropped
 * because fuzzy matching already allows gaps. Filters such as `ext:` or
 * `in:` are left untouched.
 */
export function normalizeQuery(query: string): string {
  return query
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => {
      if (!/[*?]/.test(token) || token.includes(":")) return [token];
      const extensionMatch = token.match(/^(.*)\*\.([A-Za-z0-9]{1,10})$/);
      if (extensionMatch) {
        const stem = extensionMatch[1].replace(/[*?]/g, "");
        return [
          ...(stem ? [stem] : []),
          `ext:${extensionMatch[2].toLowerCase()}`,
        ];
      }
      const stripped = token.replace(/[*?]/g, "");
      return stripped ? [stripped] : [];
    })
    .join(" ");
}
