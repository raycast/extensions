import { basename, dirname, extname } from "node:path";
import type { Hit } from "../digup/protocol";
import { escapeRegExp } from "../words";

const GROUP_OF: Record<string, string> = {
  screenshot: "Screenshots",
  image: "Images",
  pdf: "Documents",
  doc: "Documents",
  video: "Video",
  audio: "Audio",
  code: "Code",
};

const KIND_TITLE: Record<string, string> = {
  screenshot: "Screenshot",
  image: "Image",
  pdf: "PDF",
  doc: "Document",
  audio: "Audio",
  video: "Video",
  code: "Code",
};

export function kindTitle(kind: string): string {
  return KIND_TITLE[kind] ?? "File";
}

/** 6.08 → "0:06", 3725 → "1:02:05". */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.trunc(seconds));
  const two = (value: number) => String(value).padStart(2, "0");
  return total >= 3600
    ? `${Math.trunc(total / 3600)}:${two(Math.trunc(total / 60) % 60)}:${two(total % 60)}`
    : `${Math.trunc(total / 60)}:${two(total % 60)}`;
}

function span(hit: Hit): string | null {
  if (hit.loc === undefined) return null;
  const first = Math.trunc(hit.loc);
  const last = Math.trunc(hit.locEnd ?? hit.loc);
  const [one, many] = hit.segment === "cells" ? ["cell", "cells"] : ["line", "lines"];
  return first === last ? `${one} ${first}` : `${many} ${first}–${last}`;
}

/** The page or moment that matched, short enough for a badge: "p. 3", "0:06", "♪ 0:25" (a video's sound), "L12–40". */
export function placeOf(hit: Hit): string | null {
  if (hit.loc === undefined) return null;
  switch (hit.segment) {
    case "page":
    case "page_image":
      return `p. ${Math.trunc(hit.loc)}`;
    case "frame":
      return clock(hit.loc);
    case "audio":
      return hit.kind === "video" ? `♪ ${clock(hit.loc)}` : clock(hit.loc);
    case "lines": {
      const first = Math.trunc(hit.loc);
      const last = Math.trunc(hit.locEnd ?? hit.loc);
      return first === last ? `L${first}` : `L${first}–${last}`;
    }
    case "cells":
      return span(hit);
    default:
      return null;
  }
}

/** Why a result is here, in a few words. */
export function reasonOf(hit: Hit): string {
  if ((hit.z ?? 0) < 2) return hit.keywordRank !== undefined ? "Has your words" : "Matches its name";
  const at = hit.loc !== undefined ? clock(hit.loc) : "";
  const page = hit.loc !== undefined ? `page ${Math.trunc(hit.loc)}` : "a page";
  switch (hit.segment) {
    case "image":
      return hit.kind === "screenshot" ? "Matches what's on screen" : "Matches the picture";
    case "ocr":
      return "Matches the text in it";
    case "frame":
      return `Matches the frame at ${at}`;
    case "audio":
      return hit.kind === "video" ? `Matches the sound at ${at}` : `Matches what's heard at ${at}`;
    case "page":
      return `Matches the text on ${page}`;
    case "page_image":
      return `Matches ${page}`;
    case "chunk":
      return "Matches its text";
    case "lines":
    case "cells":
      return `Matches ${span(hit) ?? "the code"}`;
    default:
      return "Matches its name";
  }
}

export interface Section {
  title: string;
  hits: Hit[];
}

/** The strong hits grouped by kind, the best hit's group first; then the weaker ones, together. */
export function sections(hits: Hit[], strong: number): Section[] {
  const groups = new Map<string, Hit[]>();
  for (const hit of hits.slice(0, strong)) {
    const title = GROUP_OF[hit.kind] ?? "Files";
    groups.set(title, [...(groups.get(title) ?? []), hit]);
  }
  const result = [...groups].map(([title, rows]) => ({ title, hits: rows }));
  if (hits.length > strong) result.push({ title: "Weaker Matches", hits: hits.slice(strong) });
  return result;
}

/** Where the file is: "~/Downloads/Screenshots". Code says where it is in its repo: "billing-service/billing". */
export function folderOf(hit: Hit, home: string): string {
  const folder = dirname(hit.path);
  const repo = hit.info.repo;
  if (hit.kind === "code" && repo && hit.path.startsWith(repo + "/")) return folder.slice(dirname(repo).length + 1);
  if (folder === home) return "~";
  return folder.startsWith(home + "/") ? "~" + folder.slice(home.length) : folder;
}

/** Sizes the way Finder counts them (1 KB = 1,000 bytes): "57 KB", "2.1 MB". */
export function formatBytes(count: number): string {
  if (count < 1000) return `${count} bytes`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = count / 1000;
  let unit = 0;
  while (value >= 1000 && unit < units.length - 1) {
    value /= 1000;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

export function dateOf(seconds: number): string {
  return new Date(seconds * 1000).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

/** Text as it is written, whatever Markdown would make of its punctuation. */
export function escapeMarkdown(text: string): string {
  return text.replace(/([\\`*_{}[\]()#+!|<>~])/g, "\\$1").replace(/\./g, "\\.");
}

/** An excerpt from keyword search: the words it found come marked « », and are shown bold. */
export function excerptMarkdown(excerpt: string): string {
  return excerpt
    .split(/«([^»]*)»/)
    .map((part, index) => (index % 2 === 1 && part.trim() ? `**${escapeMarkdown(part)}**` : escapeMarkdown(part)))
    .join("");
}

/** A text short enough for the detail pane: the part around the first of `words` that's in it. */
export function passage(text: string, words: string[], max = 1200): string {
  const clean = text.trim();
  if (clean.length <= max) return clean;
  const wanted = words.filter((word) => word.length >= 2).map(escapeRegExp);
  const found = wanted.length ? clean.search(new RegExp(wanted.join("|"), "iu")) : -1;
  const start = found > 200 ? found - 200 : 0;
  return (start > 0 ? "…" : "") + clean.slice(start, start + max) + (start + max < clean.length ? "…" : "");
}

/** `text` with the query's words in bold. */
export function highlightMarkdown(text: string, words: string[]): string {
  const wanted = words
    .filter((word) => /[\p{L}\p{N}]/u.test(word))
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);
  if (wanted.length === 0) return escapeMarkdown(text);
  return text
    .split(new RegExp(`(${wanted.join("|")})`, "giu"))
    .map((part, index) => (index % 2 === 1 ? `**${escapeMarkdown(part)}**` : escapeMarkdown(part)))
    .join("");
}

const LANGUAGES: Record<string, string> = {
  c: "c",
  cc: "cpp",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  go: "go",
  h: "c",
  hpp: "cpp",
  html: "html",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "jsx",
  kt: "kotlin",
  md: "markdown",
  php: "php",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "bash",
  sql: "sql",
  swift: "swift",
  toml: "toml",
  ts: "typescript",
  tsx: "tsx",
  yaml: "yaml",
  yml: "yaml",
  zsh: "bash",
};

/** Code in a fenced block, the fence longer than any run of backticks inside it. */
export function codeFence(code: string, path: string): string {
  const language = LANGUAGES[extname(path).slice(1).toLowerCase()] ?? "";
  const longest = Math.max(2, ...(code.match(/`+/g) ?? []).map((run) => run.length));
  const fence = "`".repeat(longest + 1);
  return `${fence}${language}\n${code.replace(/\s+$/, "")}\n${fence}`;
}

/** The hit points at text the helper can hand over (`text` request). */
export function hasPassage(hit: Hit): boolean {
  return ["page", "chunk", "ocr", "lines", "cells"].includes(hit.segment);
}

// Line breaks stay line breaks, and a line that starts with spaces doesn't become a code block.
function prose(markdown: string): string {
  return markdown.replace(/^[ \t]+/gm, "").replace(/\n/g, "  \n");
}

/** The detail pane: the preview, then the passage that matched (code as code); else the excerpt, or the reason. */
export function detailMarkdown(input: {
  hit: Hit;
  previewUrl?: string;
  text?: string | null;
  words: string[];
}): string {
  const { hit, previewUrl, text, words } = input;
  const parts: string[] = [];
  if (previewUrl) parts.push(`![${escapeMarkdown(basename(hit.path))}](${previewUrl})`);
  if (text && hit.kind === "code") parts.push(codeFence(text, hit.path));
  else if (text) parts.push(prose(highlightMarkdown(passage(text, words), words)));
  else if (hit.excerpt) parts.push(prose(excerptMarkdown(hit.excerpt)));
  if (parts.length === 0) parts.push(`*${reasonOf(hit)}*`);
  return parts.join("\n\n");
}

/** The facts beside a result, in the order they're listed. */
export function metadataRows(hit: Hit, home: string): { title: string; text: string }[] {
  const rows = [{ title: "Kind", text: kindTitle(hit.kind) }];
  const place = placeOf(hit);
  if (place) rows.push({ title: "Where", text: place });
  rows.push({ title: "Why", text: reasonOf(hit) }, { title: "Folder", text: folderOf(hit, home) });
  if (hit.modified > 0) rows.push({ title: "Modified", text: dateOf(hit.modified) });
  if (hit.info.width && hit.info.height)
    rows.push({ title: "Dimensions", text: `${hit.info.width} × ${hit.info.height}` });
  if (hit.info.pages) rows.push({ title: "Pages", text: hit.info.pages });
  if (hit.info.lines) rows.push({ title: "Lines", text: hit.info.lines });
  if (hit.info.duration) rows.push({ title: "Duration", text: clock(Number(hit.info.duration)) });
  if (hit.size > 0) rows.push({ title: "Size", text: formatBytes(hit.size) });
  return rows;
}
