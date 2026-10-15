// Document text: HTML to plain text, chunks and excerpts (DigUp: Extractors.swift, DocExtractor), plus a small reader
// for docx and odt files (DigUp: Docs+Portable.swift) for when the Swift helper cannot run.

import { isUtf8 } from "node:buffer";
import { closeSync, fstatSync, openSync, readFileSync, readSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { inflateRawSync } from "node:zlib";
import {
  Graphemes,
  WHITE_SPACE,
  graphemeCount,
  graphemePrefix,
  isWhiteSpace,
  trimWhitespace,
  trimWhitespaceAndNewlines,
} from "./searchtext";

// Consumers look for these here (docs/DESIGN.md); they live in searchtext.ts.
export { PageTextProblem, checkPageText, hasWords, inflects, normalized } from "./searchtext";

/** Why a file gave no text or pictures (DigUp: ExtractError). `message` is DigUp's description, for `detail`. */
export class ExtractError extends Error {
  private constructor(
    /** "unreadable" → the file failed; "leftOut" (not for the index after all, once read) → skipped. */
    readonly kind: "unreadable" | "tooSmall" | "locked" | "empty" | "leftOut",
    message: string,
  ) {
    super(message);
    this.name = "ExtractError";
  }

  static unreadable(why: string) {
    return new ExtractError("unreadable", `unreadable: ${why}`);
  }
  static tooSmall(width: number, height: number) {
    return new ExtractError("tooSmall", `small image ${width}×${height}`);
  }
  static locked() {
    return new ExtractError("locked", "password-protected");
  }
  static empty(why: string) {
    return new ExtractError("empty", why);
  }
  static leftOut(why: string) {
    return new ExtractError("leftOut", why);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// Reading text files
// ---------------------------------------------------------------------------------------------------------------

const LONE_SURROGATE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

function utf16(bytes: Buffer, bigEndian: boolean): string | null {
  if (bytes.length % 2 !== 0) return null;
  const text = (bigEndian ? Buffer.from(bytes).swap16() : bytes).toString("utf16le");
  return LONE_SURROGATE.test(text) ? null : text;
}

function utf32le(bytes: Buffer): string | null {
  let text = "";
  for (let at = 0; at + 4 <= bytes.length; at += 4) {
    const value = bytes.readUInt32LE(at);
    if (value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) return null;
    text += String.fromCodePoint(value);
  }
  return text;
}

/** Whether an error says the text doesn't fit in a JavaScript string (about 512 MB of text), or the file in one read
 *  (2 GB). */
function isTooBig(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  return code === "ERR_STRING_TOO_LONG" || code === "ERR_FS_FILE_TOO_LARGE" || error instanceof RangeError;
}

/**
 * DigUp's `readText` (`String(contentsOf:usedEncoding:)`, else ISO Latin-1), as Foundation decodes on macOS 26: a
 * UTF-32 LE or UTF-16 byte-order mark picks that encoding, a UTF-8 one is dropped, and anything that doesn't decode
 * cleanly is read as Latin-1 whole (BOM bytes included). Foundation also reads the `com.apple.TextEncoding` attribute,
 * which this doesn't see. Text too big for a string is `ExtractError.unreadable`.
 */
export function decodeText(bytes: Uint8Array): string {
  try {
    const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const [b0, b1, b2, b3] = buffer;
    let text: string | null = null;
    if (b0 === 0xff && b1 === 0xfe && b2 === 0 && b3 === 0) text = utf32le(buffer.subarray(4));
    else if (b0 === 0xff && b1 === 0xfe) text = utf16(buffer.subarray(2), false);
    else if (b0 === 0xfe && b1 === 0xff) text = utf16(buffer.subarray(2), true);
    else {
      const body = b0 === 0xef && b1 === 0xbb && b2 === 0xbf ? buffer.subarray(3) : buffer;
      if (isUtf8(body)) text = body.toString("utf8");
    }
    return text ?? buffer.toString("latin1");
  } catch (error) {
    if (isTooBig(error)) throw ExtractError.unreadable("too big to read as text");
    throw error;
  }
}

export function readText(file: string): string {
  let bytes: Buffer;
  try {
    bytes = readFileSync(file);
  } catch (error) {
    if (isTooBig(error)) throw ExtractError.unreadable("too big to read as text");
    throw error;
  }
  return decodeText(bytes);
}

/** `readText` with the read off the event loop (a text file can be hundreds of megabytes); decoding stays here. */
export async function readTextFile(file: string): Promise<string> {
  let bytes: Buffer;
  try {
    bytes = await readFile(file);
  } catch (error) {
    if (isTooBig(error)) throw ExtractError.unreadable("too big to read as text");
    throw error;
  }
  return decodeText(bytes);
}

// ---------------------------------------------------------------------------------------------------------------
// HTML
// ---------------------------------------------------------------------------------------------------------------

/** ICU's `\b` after a word: the next character is not a letter, mark, digit or connector. */
const WORD_END = String.raw`(?![\p{Alphabetic}\p{M}\p{Nd}\p{Pc}\u200c\u200d])`;

/** DigUp's `<script\b.*?</script\s*>` and the like, as an opener and a closer each: the lazy `.*?` runs to the end of
 *  the text for every opener that's never closed, which is quadratic on a page of unclosed `<!--`. */
const DROPPED_BLOCKS: ReadonlyArray<{ opener: RegExp; closer: RegExp }> = [
  {
    opener: new RegExp(String.raw`<script${WORD_END}`, "giu"),
    closer: new RegExp(String.raw`</script${WHITE_SPACE}*>`, "giu"),
  },
  {
    opener: new RegExp(String.raw`<style${WORD_END}`, "giu"),
    closer: new RegExp(String.raw`</style${WHITE_SPACE}*>`, "giu"),
  },
  { opener: /<!--/gu, closer: /-->/gu },
  {
    opener: new RegExp(String.raw`<head${WORD_END}`, "giu"),
    closer: new RegExp(String.raw`</head${WHITE_SPACE}*>`, "giu"),
  },
];

/**
 * `text.replace(/opener…closer/g, by)` for a pattern whose match ends at the first closer after the opener (a lazy
 * `.*?`, or `[^>]*` before a `>`), in linear time. `closeAfter` finds that closer from the end of the opener: null when
 * there's none, and then no later opener can match either, so the scan stops (the regex would scan the rest of the text
 * again from every later opener: quadratic on a page of unclosed `<!--`). A closer at -1 means this opener can't match.
 */
function replaceSpans(
  text: string,
  opener: RegExp,
  closeAfter: (from: number) => { at: number; end: number } | null,
  by: string,
): string {
  let out = "";
  let kept = 0;
  let from = 0;
  for (;;) {
    opener.lastIndex = from;
    const open = opener.exec(text);
    if (!open) break;
    const close = closeAfter(open.index + open[0].length);
    if (!close) break;
    if (close.at < 0) {
      from = open.index + 1;
      continue;
    }
    out += text.slice(kept, open.index) + by;
    kept = from = close.end;
  }
  return kept === 0 ? text : out + text.slice(kept);
}

/** The first match of `closer` from `from` on. */
function next(text: string, closer: RegExp, from: number): { at: number; end: number } | null {
  closer.lastIndex = from;
  const found = closer.exec(text);
  return found ? { at: found.index, end: found.index + found[0].length } : null;
}

/** The first `>` from `from` on; `nonEmpty`: `[^>]+` needs a character before it. */
function nextAngle(text: string, from: number, nonEmpty: boolean): { at: number; end: number } | null {
  const at = text.indexOf(">", from);
  if (at < 0) return null;
  return nonEmpty && at === from ? { at: -1, end: -1 } : { at, end: at + 1 };
}
/** DigUp's `<(?:br|/p|…)\b[^>]*>` (block ends become line breaks): the tag's start; it ends at the next `>`. */
const BLOCK_ENDS = new RegExp(String.raw`<(?:br|/p|/div|/li|/h[1-6]|/tr|/section|/article)${WORD_END}`, "giu");
const TAG_START = /</g;
const ENTITIES: Record<string, string> = {
  nbsp: " ",
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  mdash: "—",
  ndash: "–",
  hellip: "…",
};
// A single pass, so "&amp;lt;" becomes "&lt;" and not "<" (DigUp loops over a dictionary in no set order). A named
// entity followed by a Grapheme_Extend mark stays: Foundation's plain search doesn't split ";" from such a mark.
const ENTITY = /&(?:(nbsp|amp|lt|gt|quot|apos|mdash|ndash|hellip);(?!\p{Grapheme_Extend})|#(x[0-9a-fA-F]+|[0-9]+);)/gu;
const WHITE_SPACE_RUN = new RegExp(`${WHITE_SPACE}+`, "gu");

function decodeEntity(whole: string, named: string | undefined, numeric: string | undefined): string {
  if (named) return ENTITIES[named];
  const value = numeric!.startsWith("x") ? parseInt(numeric!.slice(1), 16) : parseInt(numeric!, 10);
  const valid = value <= 0x10ffff && !(value >= 0xd800 && value <= 0xdfff);
  return valid ? String.fromCodePoint(value) : " ";
}

/** DigUp's `\s*\n\s*` → "\n": a run of white space that holds a line break becomes one. Linear (no backtracking). */
function mergeLineBreaks(text: string): string {
  return text.replace(WHITE_SPACE_RUN, (run) => (run.includes("\n") ? "\n" : run));
}

/** The markup steps of `plainTextFromHTML`: scripts, styles, comments and heads dropped, block ends turned into line
 *  breaks, other tags into spaces. Exported for its test. */
export function stripMarkup(html: string): string {
  let text = html;
  for (const { opener, closer } of DROPPED_BLOCKS)
    text = replaceSpans(text, opener, (from) => next(text, closer, from), " ");
  text = replaceSpans(text, BLOCK_ENDS, (from) => nextAngle(text, from, false), "\n");
  return replaceSpans(text, TAG_START, (from) => nextAngle(text, from, true), " ");
}

/** Good enough for search: drops scripts, styles and comments, turns block ends into line breaks, strips the
 *  remaining tags, and decodes common entities. */
export function plainTextFromHTML(html: string): string {
  let text = stripMarkup(html);
  text = text.replace(ENTITY, decodeEntity);
  return trimWhitespaceAndNewlines(mergeLineBreaks(text.replace(/[ \t]+/gu, " ")));
}

// ---------------------------------------------------------------------------------------------------------------
// Chunks and excerpts
// ---------------------------------------------------------------------------------------------------------------

/** DigUp's `[ \t\u{00A0}]+` → " ", touching only the runs it changes (most are already one space). */
function collapseSpaces(text: string): string {
  return text.replace(/[ \t\u00a0]{2,}|[\t\u00a0]/gu, " ");
}

const LINE_BREAK_RUN = new RegExp(`\n${WHITE_SPACE}*`, "gu");

/** DigUp's `\n\s*\n\s*\n+` → "\n\n": from the first line break of a run of white space to its end, three or more
 *  line breaks become a blank line. Linear (no backtracking). */
function squeezeBlankLines(text: string): string {
  return text.replace(LINE_BREAK_RUN, (run) => {
    const last = run.lastIndexOf("\n");
    if (last === 0 || run.indexOf("\n", 1) === last) return run; // fewer than three
    return "\n\n" + run.slice(last + 1);
  });
}

/** Whether a UTF-16 unit is neither white space (for the regexes or the trimming) nor the first half of a surrogate
 *  pair: text cut after it cleans up, up to the cut, as the whole text does. */
function endsCleanly(unit: number): boolean {
  return !isWhiteSpace(unit) && unit !== 0x200b && !(unit >= 0xd800 && unit <= 0xdbff);
}

/**
 * Splits text into ~`size`-character pieces (~450 tokens) that overlap a little, breaking at whitespace. Sizes count
 * characters the way Swift does (grapheme clusters). `limit` caps the number of chunks.
 *
 * Only the start of a long text is cleaned up and split into characters, so a long file costs what its chunks cost:
 * as much as `limit` chunks can reach, cut after a character that isn't white space (so it cleans up as the whole text
 * does), and more when the chunks come near the cut.
 */
export function chunks(text: string, limit: number, size = 1800, overlap = 200): string[] {
  for (let take = (limit + 1) * size * 2; ; take *= 2) {
    let cut = Math.min(take, text.length);
    while (cut < text.length && !endsCleanly(text.charCodeAt(cut - 1))) cut++;
    const found = chunksOf(text.slice(0, cut), cut === text.length, limit, size, overlap);
    if (found) return found;
  }
}

/** DigUp's `chunks` of `source`; null when `source` is a cut-off start of the text and the chunks come near its end. */
function chunksOf(source: string, whole: boolean, limit: number, size: number, overlap: number): string[] | null {
  const clean = new Graphemes(trimWhitespaceAndNewlines(squeezeBlankLines(collapseSpaces(source))));
  const out: string[] = [];
  let start = 0;
  while (start < clean.count && out.length < limit) {
    // The last character before a cut may go on past it: stay clear of it.
    if (!whole && start + size + 2 > clean.count) return null;
    let end = Math.min(start + size, clean.count);
    if (end < clean.count) {
      // Cut back to the last whitespace, if it is in the second half of the window.
      let space = end - 1;
      while (space >= start && !clean.isWhitespace(space)) space--;
      if (space >= start && space - start > Math.trunc(size / 2)) end = space;
    }
    const chunk = trimWhitespaceAndNewlines(clean.slice(start, end));
    if (chunk !== "") out.push(chunk);
    if (end >= clean.count) break;
    // Overlap by about `overlap` characters; none when the chunk is shorter than that.
    let next = end - overlap < start ? end : end - overlap;
    if (next <= start) next = end;
    // Start the next chunk on a word boundary.
    while (next < end && !clean.isWhitespace(next)) next++;
    start = next < end ? next : end;
  }
  return out;
}

/** One line, at most `limit` characters: for result lists. */
export function excerpt(text: string, limit = 240): string {
  // Only the start is shown, so only the start is cleaned up (a page or a chunk can be thousands of characters).
  const head = graphemePrefix(text, limit * 8);
  const line = trimWhitespace(head.replace(WHITE_SPACE_RUN, " "));
  return graphemeCount(line) > limit || head.length < text.length ? graphemePrefix(line, limit) + "…" : line;
}

// ---------------------------------------------------------------------------------------------------------------
// docx and odt without the Cocoa text system
// ---------------------------------------------------------------------------------------------------------------

const MAX_ENTRY_BYTES = 256 << 20;

/** One entry of a zip file (stored or deflated), read through its central directory. */
function readZipEntry(file: string, name: string): Buffer {
  const fd = openSync(file, "r");
  const read = (length: number, at: number): Buffer => {
    const buffer = Buffer.alloc(length);
    readSync(fd, buffer, 0, length, at);
    return buffer;
  };
  try {
    const size = fstatSync(fd).size;
    const tailLength = Math.min(size, 22 + 0xffff);
    const tail = read(tailLength, size - tailLength);
    let end = tail.length - 22;
    while (end >= 0 && tail.readUInt32LE(end) !== 0x06054b50) end--;
    if (end < 0) throw ExtractError.unreadable("not a zip file");
    const entries = tail.readUInt16LE(end + 10);
    const directory = read(tail.readUInt32LE(end + 12), tail.readUInt32LE(end + 16));
    let at = 0;
    for (let n = 0; n < entries && at + 46 <= directory.length; n++) {
      if (directory.readUInt32LE(at) !== 0x02014b50) break;
      const method = directory.readUInt16LE(at + 10);
      const packed = directory.readUInt32LE(at + 20);
      const nameLength = directory.readUInt16LE(at + 28);
      const skip = nameLength + directory.readUInt16LE(at + 30) + directory.readUInt16LE(at + 32);
      if (directory.toString("utf8", at + 46, at + 46 + nameLength) === name) {
        const local = directory.readUInt32LE(at + 42);
        const header = read(30, local);
        const data = read(packed, local + 30 + header.readUInt16LE(26) + header.readUInt16LE(28));
        if (method === 0) return data;
        if (method === 8) return inflateRawSync(data, { maxOutputLength: MAX_ENTRY_BYTES });
        throw ExtractError.unreadable("unsupported zip compression");
      }
      at += 46 + skip;
    }
    throw ExtractError.unreadable(`no ${name} inside`);
  } finally {
    closeSync(fd);
  }
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** Word-processing XML as the little HTML `plainTextFromHTML` reads: paragraph ends become `</p>`, breaks `<br>`,
 *  tabs and spaces a space; every other tag is stripped there. */
function asHTML(xml: string, paragraphs: string[], breaks: string[], spaces: string[]): string {
  let text = xml;
  for (const tag of paragraphs) text = text.replaceAll(`</${tag}>`, "</p>");
  for (const tag of breaks) text = text.replace(new RegExp(`<${escapeRegExp(tag)}${WORD_END}[^>]*/?>`, "gu"), "<br>");
  for (const tag of spaces) text = text.replace(new RegExp(`<${escapeRegExp(tag)}${WORD_END}[^>]*/?>`, "gu"), " ");
  return text;
}

/** The words of a .docx file, read from its XML. Throws DigUp's `ExtractError`s ("not a zip file", "no … inside"). */
export function docxText(file: string): string {
  const xml = readZipEntry(file, "word/document.xml").toString("utf8");
  return plainTextFromHTML(asHTML(xml, ["w:p"], ["w:br", "w:cr"], ["w:tab"]));
}

/** The words of an .odt file, read from its XML. */
export function odtText(file: string): string {
  const xml = readZipEntry(file, "content.xml").toString("utf8");
  return plainTextFromHTML(asHTML(xml, ["text:p", "text:h"], ["text:line-break"], ["text:tab", "text:s"]));
}
