/**
 * Output formats. Each format is a small function from recognized pages to a string,
 * so adding one means adding an entry to `FORMATS` and a dropdown value in package.json.
 */
import { Box, Paragraph, buildParagraphs, buildRows } from "./layout";

export type Page = { lines: Box[]; barcodes: string[] };

export type FormatOptions = {
  keepIndentation: boolean;
  plainPunctuation: boolean;
};

export const FORMAT_IDS = ["lines", "paragraphs", "single", "compact", "links", "emails"] as const;
export type FormatId = (typeof FORMAT_IDS)[number];

// Matches bullets and numbered list markers that should always start a new line.
const LIST_ITEM = /^\s*([•◦▪‣∙·*\-–—]|\(?\d{1,3}[.)]|\(?[a-zA-Z][.)])\s+/;
const URL_PATTERN =
  /\b(?:(?:https?|ftp):\/\/|www\.)[^\s<>"'`]+|\b(?:[a-z0-9-]+\.)+(?:com|org|net|io|dev|app|ai|co|edu|gov|me|xyz|us|uk|de|fr|ca|gg|tv)(?![a-z0-9-])(?:\/[^\s<>"'`]*)?/gi;
const EMAIL_PATTERN = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;

const PLAIN_PUNCTUATION: [RegExp, string][] = [
  [/[‘’‚‛′]/g, "'"],
  [/[“”„‟″]/g, '"'],
  [/[\u2010\u2011\u2012–—\u2015\u2212]/g, "-"],
  [/…/g, "..."],
  [/[\u00A0\u2000-\u200A\u202F\u205F\u3000]/g, " "],
  [/\uFB01/g, "fi"],
  [/\uFB02/g, "fl"],
  [/\uFB00/g, "ff"],
  [/\uFB03/g, "ffi"],
  [/\uFB04/g, "ffl"],
];

/** Cleanup applied to every recognized line, whatever the format. */
function clean(text: string, options: FormatOptions) {
  let result = text.normalize("NFC").replace(/[\u200B-\u200D\u2060\uFEFF]/g, "");
  if (options.plainPunctuation) {
    for (const [pattern, replacement] of PLAIN_PUNCTUATION) result = result.replace(pattern, replacement);
  }
  return result.replace(/[ \t]{2,}/g, " ").trim();
}

/**
 * True when `line` ends partway through a URL that continues on `next`, e.g. "https://" + "example.com".
 * A trailing "." or "-" usually ends a sentence or word, so it only counts when the next line
 * starts with something that looks like the rest of a URL.
 */
function endsInsideUrl(line: string, next: string) {
  const lastToken = line.split(/\s+/).pop() ?? "";
  if (!/^(?:https?:\/\/|www\.)|\.[a-z]{2,}\//i.test(lastToken)) return false;
  if (/[/?=&#_%]$/.test(lastToken)) return true;
  return /[.-]$/.test(lastToken) && /^[a-z0-9][^\s]*[./]/.test(next);
}

/** Joins two pieces of a wrapped line, undoing hyphenation like "hyphen-" + "ated". */
function joinWrapped(left: string, right: string) {
  if (endsInsideUrl(left, right)) return left + right;
  if (/\p{Ll}-$/u.test(left) && /^\p{Ll}/u.test(right)) return left.slice(0, -1) + right;
  // CJK text has no spaces between words, so wrapped lines join directly.
  if (/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Thai}]$/u.test(left)) return left + right;
  return `${left} ${right}`;
}

function paragraphsOf(pages: Page[], options: FormatOptions): Paragraph[][] {
  return pages.map((page) => {
    const boxes = page.lines.map((line) => ({ ...line, text: clean(line.text, options) }));
    return buildParagraphs(buildRows(boxes, options.keepIndentation));
  });
}

/** Barcode payloads not already present in the text, one per line. */
function withBarcodes(text: string, pages: Page[]) {
  const codes = pages.flatMap((p) => p.barcodes).filter((code) => !text.includes(code));
  return [text, ...codes].filter(Boolean).join(text ? "\n\n" : "\n");
}

function asLines(pages: Page[], options: FormatOptions) {
  const text = paragraphsOf(pages, options)
    .map((paragraphs) =>
      paragraphs.map((rows) => rows.map((row) => " ".repeat(row.indent) + row.text).join("\n")).join("\n\n"),
    )
    .join("\n\n");
  return withBarcodes(text, pages);
}

/**
 * Joins the wrapped lines of a paragraph. A line break is kept when the line before it
 * stops short of the right margin (a list item, a heading, the end of a sentence block),
 * when the next line is indented further, or when it starts a list item.
 */
function reflow(rows: Paragraph) {
  const right = Math.max(...rows.map((r) => r.right));
  const lines: string[] = [];
  rows.forEach((row, i) => {
    const previous = rows[i - 1];
    const tolerance = row.charWidth * 6;
    const wrapped =
      previous !== undefined &&
      previous.right >= right - tolerance &&
      row.left <= previous.left + row.charWidth * 1.5 &&
      !LIST_ITEM.test(row.text);
    if (wrapped) lines[lines.length - 1] = joinWrapped(lines[lines.length - 1], row.text);
    else lines.push(row.text);
  });
  return lines.join("\n");
}

function asParagraphs(pages: Page[], options: FormatOptions) {
  const noIndent = { ...options, keepIndentation: false };
  const text = paragraphsOf(pages, noIndent)
    .map((paragraphs) => paragraphs.map(reflow).join("\n\n"))
    .join("\n\n");
  return withBarcodes(text, pages);
}

function asSingleLine(pages: Page[], options: FormatOptions) {
  const rows = paragraphsOf(pages, { ...options, keepIndentation: false })
    .flat(2)
    .map((r) => r.text);
  const text = rows.reduce((joined, row) => (joined ? joinWrapped(joined, row) : row), "");
  return [text, ...pages.flatMap((p) => p.barcodes).filter((code) => !text.includes(code))].join(" ").trim();
}

function asCompact(pages: Page[], options: FormatOptions) {
  return asSingleLine(pages, options).replace(/\s+/g, "");
}

/** Rejoins URLs that wrap onto the next line, leaving every other line break alone. */
function rejoinWrappedUrls(rows: string[]) {
  const joined: string[] = [];
  for (const row of rows) {
    const previous = joined[joined.length - 1];
    if (previous !== undefined && endsInsideUrl(previous, row.trimStart()))
      joined[joined.length - 1] = previous + row.trimStart();
    else joined.push(row);
  }
  return joined;
}

/** Drops trailing punctuation that belongs to the sentence, keeping balanced brackets like "Foo_(bar)". */
function trimUrl(url: string): string {
  const trimmed = url.replace(/[.,;:!?'"]+$/, "");
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const last = trimmed.slice(-1);
  const opener = pairs[last];
  if (opener && trimmed.split(opener).length - 1 < trimmed.split(last).length - 1) return trimUrl(trimmed.slice(0, -1));
  return trimmed;
}

const unique = (values: string[]) => [...new Set(values)];

function asLinks(pages: Page[], options: FormatOptions) {
  const rows = paragraphsOf(pages, { ...options, keepIndentation: false })
    .flat(2)
    .map((r) => r.text);
  // Remove email addresses first so their domains aren't reported as links.
  const text = rejoinWrappedUrls(rows).join("\n").replace(EMAIL_PATTERN, " ");
  const codes = pages.flatMap((p) => p.barcodes).join("\n");
  const found = [...(text.match(URL_PATTERN) ?? []), ...(codes.match(URL_PATTERN) ?? [])];
  return unique(found.map(trimUrl)).join("\n");
}

function asEmails(pages: Page[], options: FormatOptions) {
  const text = paragraphsOf(pages, options)
    .flat(2)
    .map((r) => r.text)
    .join("\n");
  const codes = pages.flatMap((p) => p.barcodes).join("\n");
  return unique([...(text.match(EMAIL_PATTERN) ?? []), ...(codes.match(EMAIL_PATTERN) ?? [])]).join("\n");
}

const FORMATS: Record<FormatId, (pages: Page[], options: FormatOptions) => string> = {
  lines: asLines,
  paragraphs: asParagraphs,
  single: asSingleLine,
  compact: asCompact,
  links: asLinks,
  emails: asEmails,
};

export function formatText(pages: Page[], format: FormatId, options: FormatOptions) {
  return FORMATS[format](pages, options).trim();
}
