import { constants, gunzipSync } from "node:zlib";

/**
 * Sitemap parsing and search, with no relative imports.
 *
 * Kept dependency-free on purpose: `npm test` runs under `node --test`, which
 * cannot resolve the extensionless imports the rest of `src/` uses, and this is
 * the code whose edge cases are worth testing. `exportUtils` reads sitemaps
 * through the same scanner, so the list and the CSV export cannot disagree
 * about what a sitemap contains.
 */

/** The protocol's own ceiling for one file. A file listing more is nonconforming and reported as capped. */
export const DEFAULT_PARSE_LIMIT = 50_000;

export interface SitemapPage {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
  /** Lowercased plain text of the whole `<url>` element plus the decoded loc — what search runs against. */
  text: string;
}

export interface SitemapRef {
  loc: string;
  lastmod?: string;
  text: string;
}

/**
 * `invalid` is a server answer that is not a sitemap — an HTML app shell, a
 * JSON error. It is deliberately distinct from a urlset with no pages: one is
 * "this isn't a sitemap", the other is "this sitemap lists nothing".
 */
export type SitemapParse =
  | { kind: "urlset"; pages: SitemapPage[]; capped: boolean }
  | { kind: "index"; sitemaps: SitemapRef[]; capped: boolean }
  | { kind: "invalid"; root?: string };

/**
 * A numeric character reference, or the original text when it names nothing.
 *
 * `String.fromCodePoint` THROWS a RangeError above U+10FFFF, and this runs
 * during render — so one `&#1114112;` in a remote sitemap took out the whole
 * view rather than displaying an odd string. A reference that cannot be
 * resolved is left exactly as written.
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

function decodeEntities(text: string): string {
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
  );
}

/** Resolves the XML entities and CDATA wrapper a `<loc>` legitimately contains. */
export function decodeXmlText(raw: string): string {
  const cdata = /^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/.exec(raw);
  return cdata ? cdata[1].trim() : decodeEntities(raw).trim();
}

/** Whether the character after `<name` ends the name — so `<url` does not match `<urlset>`. */
function endsName(ch: string | undefined): boolean {
  return ch === ">" || ch === "/" || ch === " " || ch === "\t" || ch === "\n" || ch === "\r";
}

/**
 * Splits on an element by scanning, not by regex.
 *
 * `/<url>([\s\S]*?)<\/url>/g` looks equivalent and is quadratic on malformed
 * input: a body of repeated `<url>` with no closing tag makes every opener
 * rescan the whole remaining suffix. Measured at 138ms / 560ms / 2,220ms for
 * 10k / 20k / 40k openers — and this runs on a response whose size the server
 * chooses. indexOf is linear and cannot backtrack.
 *
 * Stops at `limit` blocks; `capped` says whether another opener was waiting.
 */
export function scanElements(xml: string, tag: string, limit: number): { blocks: string[]; capped: boolean } {
  const open = `<${tag}`;
  const close = `</${tag}>`;
  const blocks: string[] = [];
  let cursor = 0;

  while (true) {
    const start = xml.indexOf(open, cursor);
    if (start === -1) break;
    if (!endsName(xml[start + open.length])) {
      cursor = start + open.length;
      continue;
    }
    if (blocks.length >= limit) return { blocks, capped: true };
    const contentStart = xml.indexOf(">", start);
    if (contentStart === -1) break;
    if (xml[contentStart - 1] === "/") {
      // `<url/>` — an element with nothing in it.
      blocks.push("");
      cursor = contentStart + 1;
      continue;
    }
    const end = xml.indexOf(close, contentStart);
    if (end === -1) break; // cut off mid-element: keep what was complete
    blocks.push(xml.slice(contentStart + 1, end));
    cursor = end + close.length;
  }
  return { blocks, capped: false };
}

/** First child element's decoded text, or "". Bounded scan, no backtracking. */
export function childText(block: string, tag: string): string {
  const open = `<${tag}`;
  let cursor = 0;
  while (true) {
    const start = block.indexOf(open, cursor);
    if (start === -1) return "";
    if (!endsName(block[start + open.length])) {
      cursor = start + open.length;
      continue;
    }
    const contentStart = block.indexOf(">", start);
    if (contentStart === -1 || block[contentStart - 1] === "/") return "";
    const end = block.indexOf(`</${tag}>`, contentStart);
    if (end === -1) return "";
    return decodeXmlText(block.slice(contentStart + 1, end));
  }
}

/**
 * The document's root element, skipping the declaration, comments and a doctype.
 * `prefix` keeps a namespace prefix (`sm:`) so children are scanned under the
 * same one — without it a prefixed urlset parses as an EMPTY one, which is a
 * failure dressed as an answer.
 */
function rootElement(xml: string): { local: string; prefix: string } | undefined {
  let cursor = 0;
  while (true) {
    const lt = xml.indexOf("<", cursor);
    if (lt === -1) return undefined;
    const next = xml[lt + 1];
    if (next === "?") {
      const end = xml.indexOf("?>", lt);
      if (end === -1) return undefined;
      cursor = end + 2;
      continue;
    }
    if (next === "!") {
      const isComment = xml.startsWith("<!--", lt);
      const end = isComment ? xml.indexOf("-->", lt + 4) : xml.indexOf(">", lt);
      if (end === -1) return undefined;
      cursor = end + (isComment ? 3 : 1);
      continue;
    }
    const name = /^[A-Za-z_][\w.:-]*/.exec(xml.slice(lt + 1, lt + 101))?.[0];
    if (!name) return undefined;
    const colon = name.indexOf(":");
    return colon === -1
      ? { local: name, prefix: "" }
      : { local: name.slice(colon + 1), prefix: name.slice(0, colon + 1) };
  }
}

/**
 * The element's text content with tags removed, built by scanning. CDATA
 * sections keep their content (a `<![CDATA[…]]>` contains no `>` until its end,
 * so a tag-stripping regex would delete the very text inside it).
 */
function plainText(block: string): string {
  const parts: string[] = [];
  let cursor = 0;
  while (cursor < block.length) {
    const lt = block.indexOf("<", cursor);
    if (lt === -1) {
      parts.push(block.slice(cursor));
      break;
    }
    parts.push(block.slice(cursor, lt));
    if (block.startsWith("<![CDATA[", lt)) {
      const end = block.indexOf("]]>", lt + 9);
      if (end === -1) {
        parts.push(block.slice(lt + 9));
        break;
      }
      parts.push(block.slice(lt + 9, end));
      cursor = end + 3;
      continue;
    }
    const gt = block.indexOf(">", lt);
    if (gt === -1) break;
    cursor = gt + 1;
  }
  return decodeEntities(parts.join(" "));
}

function safeDecodeComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function searchText(block: string, loc: string): string {
  return `${plainText(block)} ${safeDecodeComponent(loc)}`.replace(/\s+/g, " ").trim().toLowerCase();
}

/**
 * `xml` without its comments, so a commented-out `<url>` is not an entry. CDATA
 * sections are kept whole: a `<loc>` may hold `<!--` as text. Linear: each
 * search starts where the last one ended.
 */
export function stripComments(xml: string): string {
  if (!xml.includes("<!--")) return xml;
  const parts: string[] = [];
  let cursor = 0;
  let cdata = xml.indexOf("<![CDATA[");
  while (true) {
    const comment = xml.indexOf("<!--", cursor);
    if (comment === -1) break;
    if (cdata !== -1 && cdata < cursor) cdata = xml.indexOf("<![CDATA[", cursor);
    if (cdata !== -1 && cdata < comment) {
      const end = xml.indexOf("]]>", cdata + 9);
      if (end === -1) break;
      parts.push(xml.slice(cursor, end + 3));
      cursor = end + 3;
      continue;
    }
    parts.push(xml.slice(cursor, comment));
    const end = xml.indexOf("-->", comment + 4);
    // An unclosed comment runs to the end of the file.
    cursor = end === -1 ? xml.length : end + 3;
  }
  parts.push(xml.slice(cursor));
  return parts.join("");
}

/**
 * Entries named with the root's prefix, or unprefixed when the root's prefix
 * finds none: `<sm:urlset>` may declare the same namespace as its default and
 * write `<url>` bare. Returns the prefix that matched, for the entry's fields.
 */
function scanEntries(xml: string, prefix: string, tag: string, limit: number) {
  const scan = scanElements(xml, `${prefix}${tag}`, limit);
  if (!prefix || scan.blocks.length > 0) return { ...scan, prefix };
  return { ...scanElements(xml, tag, limit), prefix: "" };
}

export function parseSitemap(xml: string, limit: number = DEFAULT_PARSE_LIMIT): SitemapParse {
  const root = rootElement(xml);
  if (!root) return { kind: "invalid" };
  const { local } = root;
  const body = stripComments(xml);

  if (local === "urlset") {
    const { blocks, capped, prefix } = scanEntries(body, root.prefix, "url", limit);
    const pages: SitemapPage[] = [];
    for (const block of blocks) {
      const loc = childText(block, `${prefix}loc`);
      if (!loc) continue;
      pages.push({
        loc,
        lastmod: childText(block, `${prefix}lastmod`) || undefined,
        changefreq: childText(block, `${prefix}changefreq`) || undefined,
        priority: childText(block, `${prefix}priority`) || undefined,
        text: searchText(block, loc),
      });
    }
    return { kind: "urlset", pages, capped };
  }

  if (local === "sitemapindex") {
    const { blocks, capped, prefix } = scanEntries(body, root.prefix, "sitemap", limit);
    const sitemaps: SitemapRef[] = [];
    for (const block of blocks) {
      const loc = childText(block, `${prefix}loc`);
      if (!loc) continue;
      sitemaps.push({ loc, lastmod: childText(block, `${prefix}lastmod`) || undefined, text: searchText(block, loc) });
    }
    return { kind: "index", sitemaps, capped };
  }

  return { kind: "invalid", root: `${root.prefix}${local}` };
}

/**
 * Every entry whose search text contains every whitespace-separated token of
 * `query`, case-insensitively. Returns at most `limit` of them, but counts them
 * all, so the view can say "2,000 of 14,320" instead of implying the first page
 * of matches is the whole answer.
 */
export function filterEntries<T extends { text: string }>(
  entries: readonly T[],
  query: string,
  limit: number,
): { items: T[]; total: number } {
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return { items: entries.slice(0, limit), total: entries.length };

  const items: T[] = [];
  let total = 0;
  for (const entry of entries) {
    if (!tokens.every((token) => entry.text.includes(token))) continue;
    total++;
    if (items.length < limit) items.push(entry);
  }
  return { items, total };
}

const MB = 1024 * 1024;

/**
 * Bytes off the wire → text. Gzip is detected by its magic bytes rather than
 * the URL: `.xml.gz` children are often served with `Content-Encoding: gzip`,
 * which `fetch` has already undone, and a misnamed file is still compressed.
 *
 * `downloadTruncated` is the reader hitting its byte cap. A gzip stream cut
 * there still inflates (Z_SYNC_FLUSH) to everything that arrived. A stream that
 * ends early on its own is damaged, and inflating it is an error, not a sitemap
 * that looks complete. Inflating
 * PAST `maxBytes` is an error instead of a partial, because zlib gives back
 * nothing at all in that case — there is no partial to report.
 */
export function decodeSitemapBody(
  bytes: Uint8Array,
  maxBytes: number,
  downloadTruncated: boolean,
): { text: string; truncated: boolean } {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  if (bytes.length < 2 || bytes[0] !== 0x1f || bytes[1] !== 0x8b) {
    return { text: decoder.decode(bytes), truncated: downloadTruncated };
  }
  try {
    const inflated = gunzipSync(bytes, {
      maxOutputLength: maxBytes,
      ...(downloadTruncated ? { finishFlush: constants.Z_SYNC_FLUSH } : {}),
    });
    return { text: decoder.decode(inflated), truncated: downloadTruncated };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ERR_BUFFER_TOO_LARGE") {
      throw new Error(`Decompressed sitemap is larger than ${Math.round(maxBytes / MB)} MB`);
    }
    throw new Error(`Could not decompress the sitemap: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * `2026-08-07` is a calendar date, not midnight UTC. Formatting it in local
 * time puts it on Aug 6 for anyone west of Greenwich, so a date-only value is
 * formatted in UTC; a full timestamp is a real instant and gets local time.
 */
export function formatLastmod(value: string): string {
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00Z` : value);
  if (isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(dateOnly ? { timeZone: "UTC" } : {}),
  });
}

/**
 * The path, decoded for reading, as an entry's title — unique within a site and
 * what people type when they search. The host is added only when the entry is
 * on a different one, which is the case a bare path would hide.
 */
export function pageTitle(loc: string, baseHost: string): string {
  let url: URL;
  try {
    url = new URL(loc);
  } catch {
    return loc;
  }
  let path = `${url.pathname}${url.search}`;
  try {
    path = decodeURI(path);
  } catch {
    // Malformed escapes: show them as written.
  }
  return url.hostname === baseHost.toLowerCase() ? path : `${url.host}${path}`;
}
