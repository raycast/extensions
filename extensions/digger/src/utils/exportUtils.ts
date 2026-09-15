import { mkdir, writeFile } from "fs/promises";
import { homedir } from "os";
import { join } from "path";
import { LIMITS } from "./config";

/**
 * Conversions shared by every "Copy as …" / "Download as …" action.
 *
 * One place, because the alternative is each section inventing its own CSV
 * quoting and its own filename rules, and they drift.
 */

export type ExportFormat = "text" | "markdown" | "csv";

/**
 * A resource in the two shapes an export can be built from.
 *
 * `text` is always available — it is what the server sent. `rows` exists only
 * when the resource has real tabular structure (a sitemap's URLs, a JSON array
 * of records, a header list). CSV and a Markdown table are offered only when
 * `rows` is present: rendering arbitrary text as CSV produces a one-column file
 * that is worse than the text it came from.
 */
export interface Exportable {
  /** Base filename without extension, e.g. "robots.txt" or "assetlinks.json". */
  name: string;
  /** Raw resource body. */
  text: string;
  /** Header row followed by data rows, when the resource is tabular. */
  rows?: { headers: string[]; values: string[][] };
  /** Fenced-code language for Markdown output, e.g. "json", "xml". */
  language?: string;
}

/**
 * RFC 4180 quoting, plus formula neutralisation.
 *
 * Quoting alone does NOT stop a spreadsheet executing a cell: Excel, Sheets and
 * Numbers all evaluate a value beginning `=`, `+`, `-`, `@`, or a leading tab or
 * carriage return, quoted or not. Every value here came off a remote server, so
 * a well-known file containing `[{"value":"=1+1"}]` would arrive as a live
 * formula in the user's spreadsheet. Prefixing an apostrophe is the standard
 * neutralisation and is stripped by the spreadsheet on display.
 */
function csvCell(value: string): string {
  const neutralised = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\n\r]/.test(neutralised) ? `"${neutralised.replace(/"/g, '""')}"` : neutralised;
}

export function toCsv(rows: NonNullable<Exportable["rows"]>): string {
  return [rows.headers, ...rows.values].map((r) => r.map(csvCell).join(",")).join("\n");
}

/** Escapes the pipe, which is the only character that can break a table cell. */
function mdCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\n/g, " ");
}

export function toMarkdown(resource: Exportable): string {
  const { name, text, rows, language } = resource;
  if (rows) {
    const header = `| ${rows.headers.map(mdCell).join(" | ")} |`;
    const rule = `| ${rows.headers.map(() => "---").join(" | ")} |`;
    const body = rows.values.map((r) => `| ${r.map(mdCell).join(" | ")} |`).join("\n");
    return `# ${name}\n\n${header}\n${rule}\n${body}\n`;
  }
  // No structure to render, so the body goes in a fence — which also stops a
  // resource containing Markdown syntax from reformatting itself. The fence has
  // to out-length any backtick run inside the body, or a resource containing
  // ``` closes it early and the rest renders as Markdown.
  const longestRun = [...text.matchAll(/`+/g)].reduce((max, m) => Math.max(max, m[0].length), 0);
  const fence = "`".repeat(Math.max(3, longestRun + 1));
  return `# ${name}\n\n${fence}${language ?? ""}\n${text}\n${fence}\n`;
}

export function toFormat(resource: Exportable, format: ExportFormat): string {
  switch (format) {
    case "text":
      return resource.text;
    case "markdown":
      return toMarkdown(resource);
    case "csv":
      return resource.rows ? toCsv(resource.rows) : resource.text;
  }
}

const EXTENSION: Record<ExportFormat, string> = { text: "txt", markdown: "md", csv: "csv" };

/** `assetlinks.json` + csv → `assetlinks.csv`; `robots.txt` + md → `robots.md`. */
export function exportFilename(name: string, format: ExportFormat): string {
  const base = name.replace(/\.[a-z0-9]+$/i, "") || "resource";
  const safe = base.replace(/[/\\:]/g, "-");
  return `${safe}.${EXTENSION[format]}`;
}

/**
 * Writes to ~/Downloads, never overwriting: an existing name gains ` 2`, ` 3`, …
 * the way the Finder does. Returns the path actually written.
 */
export async function downloadToFile(resource: Exportable, format: ExportFormat): Promise<string> {
  const contents = toFormat(resource, format);
  const filename = exportFilename(resource.name, format);
  const directory = join(homedir(), "Downloads");
  // A machine without ~/Downloads otherwise fails every download with ENOENT.
  await mkdir(directory, { recursive: true });
  const dot = filename.lastIndexOf(".");
  const stem = filename.slice(0, dot);
  const ext = filename.slice(dot);

  for (let n = 1; n < 100; n++) {
    const candidate = join(directory, n === 1 ? filename : `${stem} ${n}${ext}`);
    try {
      // `wx` fails when the path exists, so the check and the write cannot race
      // each other — a plain existsSync test can, and would clobber.
      await writeFile(candidate, contents, { flag: "wx" });
      return candidate;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
    }
  }
  throw new Error(`Could not find an unused filename for ${filename} in ~/Downloads`);
}

/**
 * Builds `rows` from parsed JSON when its shape is genuinely tabular: an array
 * of flat objects. Anything else (a nested object, an array of arrays) returns
 * undefined, and the caller simply offers no CSV rather than flattening
 * structure into a misleading grid.
 */
export function rowsFromJson(text: string): Exportable["rows"] {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (!Array.isArray(parsed) || parsed.length === 0) return undefined;

  const records = parsed.filter(
    (item): item is Record<string, unknown> => typeof item === "object" && item !== null && !Array.isArray(item),
  );
  if (records.length !== parsed.length) return undefined;

  const headers = [...new Set(records.flatMap((r) => Object.keys(r)))];
  if (headers.length === 0) return undefined;

  const values = records.map((r) =>
    headers.map((h) => {
      const v = r[h];
      if (v === undefined || v === null) return "";
      return typeof v === "object" ? JSON.stringify(v) : String(v);
    }),
  );
  return { headers, values };
}

/**
 * A numeric character reference, or the original text when it names nothing.
 *
 * `String.fromCodePoint` THROWS a RangeError above U+10FFFF, and this runs inside
 * `inferRows` during render — so one `&#1114112;` in a remote sitemap took out the
 * whole detail view and its export actions rather than displaying an odd string.
 * A reference that cannot be resolved is left exactly as written: that is what the
 * bytes said, and substituting a replacement character would be a quieter lie.
 */
function codePoint(value: number, original: string): string {
  if (!Number.isInteger(value) || value < 0 || value > 0x10ffff) return original;
  // Lone surrogates are accepted by fromCodePoint but are not valid XML and
  // corrupt any string they land in.
  if (value >= 0xd800 && value <= 0xdfff) return original;
  try {
    return String.fromCodePoint(value);
  } catch {
    return original;
  }
}

/** Resolves the XML entities a <loc> legitimately contains. */
function decodeXmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  const text = cdata ? cdata[1] : raw;
  return (
    text
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#(\d+);/g, (whole, code) => codePoint(Number(code), whole))
      .replace(/&#x([0-9a-f]+);/gi, (whole, code) => codePoint(parseInt(code, 16), whole))
      // Ampersand last, or `&amp;lt;` would decode twice.
      .replace(/&amp;/g, "&")
      .trim()
  );
}

/**
 * Splits on an element by scanning, not by regex.
 *
 * `/<url>([\s\S]*?)<\/url>/g` looks equivalent and is quadratic on malformed
 * input: a body of repeated `<url>` with no closing tag makes every opener
 * rescan the whole remaining suffix. Measured at 138ms / 560ms / 2,220ms for
 * 10k / 20k / 40k openers — and this runs during render, on a response whose
 * size the server chooses. indexOf is linear and cannot backtrack.
 */
function scanElements(xml: string, tag: string): string[] {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const blocks: string[] = [];
  let cursor = 0;

  while (blocks.length < LIMITS.MAX_EXPORT_ROWS) {
    const start = xml.indexOf(open, cursor);
    if (start === -1) break;
    // `<url` must be the whole tag name, not the prefix of `<urlset>`.
    const afterName = xml[start + open.length];
    const contentStart = xml.indexOf(">", start);
    if (contentStart === -1) break;
    if (afterName !== ">" && afterName !== " " && afterName !== "\t" && afterName !== "\n" && afterName !== "\r") {
      cursor = start + open.length;
      continue;
    }
    const end = xml.indexOf(close, contentStart);
    if (end === -1) break;
    blocks.push(xml.slice(contentStart + 1, end));
    cursor = end + close.length;
  }
  return blocks;
}

/** First child element's decoded text, or "". Bounded scan, no backtracking. */
function childText(block: string, tag: string): string {
  const start = block.indexOf(`<${tag}`);
  if (start === -1) return "";
  const contentStart = block.indexOf(">", start);
  const end = block.indexOf(`</${tag}>`, contentStart);
  if (contentStart === -1 || end === -1) return "";
  return decodeXmlText(block.slice(contentStart + 1, end));
}

/** URLs out of a sitemap, in document order. */
export function rowsFromSitemap(text: string): Exportable["rows"] {
  const entries = scanElements(text, "url");
  if (entries.length > 0) {
    return {
      headers: ["loc", "lastmod", "changefreq", "priority"],
      values: entries.map((block) => [
        childText(block, "loc"),
        childText(block, "lastmod"),
        childText(block, "changefreq"),
        childText(block, "priority"),
      ]),
    };
  }

  // A sitemap index lists other sitemaps rather than pages.
  const indexed = scanElements(text, "sitemap");
  if (indexed.length > 0) {
    return {
      headers: ["loc", "lastmod"],
      values: indexed.map((block) => [childText(block, "loc"), childText(block, "lastmod")]),
    };
  }
  return undefined;
}

/** `Disallow: /admin` → a directive/value grid. Comments and blanks dropped. */
export function rowsFromRobots(text: string): Exportable["rows"] {
  const values: string[][] = [];
  for (const line of text.split(/\r?\n/)) {
    if (values.length >= LIMITS.MAX_EXPORT_ROWS) break;
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) continue;
    const colon = trimmed.indexOf(":");
    if (colon === -1) continue;
    values.push([trimmed.slice(0, colon).trim(), trimmed.slice(colon + 1).trim()]);
  }
  return values.length > 0 ? { headers: ["directive", "value"], values } : undefined;
}

/** Picks the right row extractor from the resource name and its bytes. */
export function inferRows(name: string, text: string): Exportable["rows"] {
  if (/\.json$|association$/i.test(name)) return rowsFromJson(text);
  if (/sitemap/i.test(name) || /^\s*<(\?xml|urlset|sitemapindex)/i.test(text)) return rowsFromSitemap(text);
  if (/robots/i.test(name)) return rowsFromRobots(text);
  return rowsFromJson(text);
}

/**
 * Re-indents a minified file for reading.
 *
 * DISPLAY ONLY. Copy and Download always emit the original bytes, because a
 * `.well-known` file is a document with a signature-relevant byte sequence as
 * often as it is something to read, and silently handing back a reformatted
 * copy would be a different file from the one the server serves.
 *
 * Returns the input unchanged when it cannot be parsed — a malformed file must
 * still be readable, and swallowing it into an error state would hide the very
 * thing the user opened it to see.
 */
export function prettyPrint(text: string, language: string): string {
  if (language === "json") {
    try {
      return JSON.stringify(JSON.parse(text), null, 2);
    } catch {
      return text;
    }
  }
  if (language === "xml") return prettyPrintXml(text);
  return text;
}

/**
 * Indents XML by tag depth. Not a parser: it re-flows whitespace between tags
 * and never rewrites content, so an unbalanced document degrades to odd
 * indentation rather than to mangled markup.
 */
function prettyPrintXml(xml: string): string {
  // Already indented — leave it. Reformatting a hand-formatted sitemap only
  // makes it differ from what the author wrote.
  if (/>\s*\n\s+</.test(xml)) return xml;

  const withBreaks = xml.replace(/>\s*</g, ">\n<");
  const lines = withBreaks.split("\n");
  const out: string[] = [];
  let depth = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "") continue;
    if (/^<\/[^>]+>/.test(trimmed)) depth = Math.max(0, depth - 1);
    out.push("  ".repeat(depth) + trimmed);
    const isOpen = /^<[^!?/]/.test(trimmed);
    const selfCloses = /\/>$/.test(trimmed);
    const closesOnSameLine = /^<([^\s/>]+)[^>]*>.*<\/\1>$/.test(trimmed);
    if (isOpen && !selfCloses && !closesOnSameLine) depth++;
  }
  return out.join("\n");
}

/** Fenced-code language for Markdown and for the Detail viewer. */
export function inferLanguage(name: string, contentType?: string): string {
  const type = (contentType ?? "").toLowerCase();
  if (type.includes("json") || /\.json$|association$/i.test(name)) return "json";
  if (type.includes("xml") || /\.xml$|sitemap/i.test(name)) return "xml";
  if (type.includes("html")) return "html";
  return "";
}
