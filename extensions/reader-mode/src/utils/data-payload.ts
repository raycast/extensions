/**
 * Articles carried in a page's data payload: Nuxt's `<script id="__NUXT_DATA__">` or Next.js's
 * `<script id="__NEXT_DATA__">`.
 *
 * These sites ship the data their pages render from as JSON, and some ship the whole article
 * there while the visible page shows only a teaser behind a subscribe wall (bizjournals.com on
 * Nuxt, theatlantic.com on Next.js).
 * Readability reads only the visible page, so it sees the teaser and gives up.
 *
 * Sites name their fields differently, so this doesn't look for a known path. It looks for the
 * shape an article body takes: a list of blocks, each an object with an HTML or text field.
 * A payload also holds comments, story cards, and embeds in the same shape, so a list is only
 * taken for the article when it opens with a paragraph the page itself shows.
 *
 * The payload comes from a web page, so every pass over it is linear and every list is bounded
 * before it's built.
 */

import { parseHTML } from "linkedom";
import { resolveLazyImages } from "./html-cleaner";
import { asciiLower, decodeEntities } from "./markdown-source";

type LinkedomDocument = ReturnType<typeof parseHTML>["document"];

/** A payload larger than this is skipped rather than parsed. */
const MAX_PAYLOAD_LENGTH = 5 * 1024 * 1024;

/**
 * The most markup, and the most tags, one candidate may hold. A payload can point at one string
 * many times, so its serialized size doesn't bound what a list expands to, and a DOM costs far
 * more per tag than per character.
 */
const MAX_ARTICLE_HTML_LENGTH = 1024 * 1024;
const MAX_ARTICLE_TAGS = 20_000;

/** Below this much text, or this many blocks with text, a block list isn't taken for the article. */
const MIN_ARTICLE_TEXT_LENGTH = 500;
const MIN_BLOCKS = 3;

/**
 * A paragraph whose first this-many characters appear on the page ties its list to the page.
 * Short, because a teaser can cut its paragraph off early.
 */
const SHARED_OPENING_LENGTH = 40;

/** The article's opening: a list must match the page in one of its first this-many paragraphs. */
const OPENING_BLOCKS = 3;

/** The fields a block keeps its markup or text in, in the order they're tried. */
const BODY_FIELDS = ["html", "innerHtml", "text", "body", "content"];

/** Keys that mark an object as a `<head>` tag (`{ name, content }`), not an article block. */
const HEAD_TAG_KEYS = ["name", "property", "rel", "hid", "charset", "http-equiv"];

/** Elements whose contents aren't text a reader sees, and are removed from the article. */
const RAW_TEXT_ELEMENTS = ["script", "style", "iframe", "noscript"];

/**
 * Nuxt serializes its payload with devalue: a flat array where objects and arrays hold indexes
 * into it, and reactive wrappers are `["Reactive", index]`. Index 0 is the root.
 */
type Payload = unknown[];

const WRAPPERS = new Set(["Reactive", "ShallowReactive", "Ref", "ShallowRef"]);

/** The index `index` resolves to once reactive wrappers are unwrapped, or -1 for none. */
function resolve(payload: Payload, index: unknown): number {
  for (let hops = 0; typeof index === "number" && index >= 0 && index < payload.length && hops < 8; hops++) {
    const value = payload[index];
    if (!(Array.isArray(value) && typeof value[0] === "string" && WRAPPERS.has(value[0]))) return index;
    index = value[1];
  }
  return -1;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * The most entries a Next.js payload may flatten to. Each costs a slot and an object, so a few
 * megabytes of small values would otherwise fill the extension's heap before any list is weighed.
 */
const MAX_FLATTENED_ENTRIES = 200_000;

/** A payload and the entries its walk starts from. */
interface Flat {
  payload: Payload;
  roots: number[];
}

/**
 * A Next.js payload as the flat array Nuxt's is, so one walk reads both: objects and arrays hold
 * indexes. A string holding JSON is also parsed, because a data cache (urql, on The Atlantic) keeps
 * its results as text; the parse becomes a root of its own and the string stays as it was, so a
 * block whose text is JSON keeps its text. Every string parsed counts against the payload's size
 * limit. Null when the payload has too many entries.
 */
function flatten(root: unknown): Flat | null {
  const payload: Payload = [null];
  const roots = [0];
  let budget = MAX_PAYLOAD_LENGTH;
  const stack: { value: unknown; at: number }[] = [{ value: root, at: 0 }];
  const slot = (value: unknown) => {
    const at = payload.push(null) - 1;
    stack.push({ value, at });
    return at;
  };
  while (stack.length) {
    if (payload.length > MAX_FLATTENED_ENTRIES) return null;
    const { value, at } = stack.pop()!;
    if (Array.isArray(value)) {
      const node: number[] = [];
      for (const child of value) {
        if (payload.length >= MAX_FLATTENED_ENTRIES) return null;
        node.push(slot(child));
      }
      payload[at] = node;
    } else if (isRecord(value)) {
      // No prototype, so a "__proto__" key is a key like any other. for...in, so a huge object's
      // keys aren't listed before the limit is checked; a parsed object has no inherited keys.
      const node: Record<string, number> = Object.create(null);
      for (const key in value) {
        if (payload.length >= MAX_FLATTENED_ENTRIES) return null;
        node[key] = slot(value[key]);
      }
      payload[at] = node;
    } else {
      payload[at] = value;
      if (typeof value === "string" && /^\s*[[{]/.test(value) && value.length <= budget) {
        budget -= value.length;
        try {
          roots.push(slot(JSON.parse(value)));
        } catch {
          // Text that only looks like JSON
        }
      }
    }
  }
  return { payload, roots };
}

/** Removes script, style, iframe, and noscript elements, one pass; an unclosed one runs to the end. */
function dropRawText(html: string): string {
  const lower = asciiLower(html);
  const opener = /<(script|style|iframe|noscript)\b/g;
  let out = "";
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = opener.exec(lower))) {
    out += html.slice(last, match.index);
    const close = lower.indexOf(`</${match[1]}`, opener.lastIndex);
    if (close === -1) return out;
    last = lower.indexOf(">", close) + 1 || html.length;
    opener.lastIndex = last;
  }
  return out + html.slice(last);
}

/** Removes comments, one pass; an unclosed one runs to the end. */
function dropComments(html: string): string {
  let out = "";
  let last = 0;
  for (let open = html.indexOf("<!--"); open !== -1; open = html.indexOf("<!--", last)) {
    out += html.slice(last, open);
    const close = html.indexOf("-->", open + 4);
    if (close === -1) return out;
    last = close + 3;
  }
  return out + html.slice(last);
}

/**
 * The text a reader would see, as the DOM's textContent reads it: "<a>Portland</a>, is" is
 * "Portland, is". A tag can't contain "<", which keeps a run of unclosed "<" linear.
 */
function visibleText(html: string): string {
  return decodeEntities(dropComments(dropRawText(html)).replace(/<[^<>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim();
}

function normalize(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

function countTags(html: string): number {
  let count = 0;
  for (let i = html.indexOf("<"); i !== -1; i = html.indexOf("<", i + 1)) count++;
  return count;
}

/** A payload string read once, however many blocks point at it. */
interface Markup {
  html: string;
  text: string;
  /** `text`, lowercased with whitespace collapsed, for matching against the page. */
  normalized: string;
  tags: number;
}

interface Block extends Markup {
  type: string;
}

interface Candidate {
  blocks: Block[];
  textLength: number;
}

/**
 * The block lists that could be the article, longest first. Walks the payload from its root,
 * visiting each entry once, so a payload that references itself can't loop. Each string is
 * read once and each list counts a block once, so the walk is linear in the payload's size.
 */
function findCandidates({ payload, roots }: Flat): Candidate[] {
  const candidates: Candidate[] = [];
  const markup = new Map<number, Markup>();
  const readMarkup = (index: number): Markup | null => {
    const html = payload[index];
    if (typeof html !== "string") return null;
    let read = markup.get(index);
    if (!read) {
      const text = visibleText(html);
      read = { html, text, normalized: normalize(text), tags: countTags(html) };
      markup.set(index, read);
    }
    return read;
  };
  // Blocks are shared, too: any number of lists can point at one block object.
  const blockCache = new Map<number, Block | null>();
  const toBlock = (index: number): Block | null => {
    if (blockCache.has(index)) return blockCache.get(index)!;
    const value = payload[index];
    let block: Block | null = null;
    if (isRecord(value) && !HEAD_TAG_KEYS.some((key) => key in value)) {
      for (const field of BODY_FIELDS) {
        const at = resolve(payload, value[field]);
        const read = at === -1 ? null : readMarkup(at);
        if (read) {
          const type = payload[resolve(payload, value.type)];
          block = { ...read, type: typeof type === "string" ? type : "" };
          break;
        }
      }
    }
    blockCache.set(index, block);
    return block;
  };
  // Lists holding the same blocks in the same order are one candidate, however many there are.
  const listed = new Set<string>();

  const seen = new Set<number>();
  const queue = [...roots];
  while (queue.length) {
    const index = queue.pop()!;
    if (seen.has(index)) continue;
    seen.add(index);
    const value = payload[index];
    if (Array.isArray(value) && typeof value[0] === "string" && WRAPPERS.has(value[0])) {
      if (typeof value[1] === "number") queue.push(value[1]);
      continue;
    }
    if (Array.isArray(value)) {
      const blocks: Block[] = [];
      const indexes: number[] = [];
      const inList = new Set<number>();
      let textLength = 0;
      let htmlLength = 0;
      let tags = 0;
      for (const child of value) {
        const resolved = resolve(payload, child);
        if (resolved === -1 || inList.has(resolved)) continue;
        inList.add(resolved);
        const block = toBlock(resolved);
        if (!block) continue;
        blocks.push(block);
        indexes.push(resolved);
        textLength += block.text.length;
        htmlLength += block.html.length;
        // Each block also gets a wrapping element when it's built.
        tags += block.tags + 2;
        if (htmlLength > MAX_ARTICLE_HTML_LENGTH || tags > MAX_ARTICLE_TAGS) break;
      }
      const withText = blocks.filter((block) => block.text).length;
      const bounded = htmlLength <= MAX_ARTICLE_HTML_LENGTH && tags <= MAX_ARTICLE_TAGS;
      if (bounded && withText >= MIN_BLOCKS && textLength >= MIN_ARTICLE_TEXT_LENGTH) {
        const key = indexes.join();
        if (!listed.has(key)) {
          listed.add(key);
          candidates.push({ blocks, textLength });
        }
      }
    }
    const children = Array.isArray(value) ? value : isRecord(value) ? Object.values(value) : [];
    for (const child of children) {
      if (typeof child === "number" && child >= 0 && child < payload.length && !seen.has(child)) queue.push(child);
    }
  }
  return candidates.sort((a, b) => b.textLength - a.textLength);
}

const BLOCK_TAG = /^\s*<(?:p|ul|ol|h[1-6]|blockquote|figure|table|pre|div)[\s>]/i;

/** One block as HTML: markup that's already a block element is kept, text is wrapped. */
function blockHtml({ type, html }: Block): string {
  if (BLOCK_TAG.test(html)) return html;
  if (/^(?:h[1-6]|heading|subhead(?:ing)?|header)$/i.test(type)) return `<h2>${html}</h2>`;
  if (/quote/i.test(type)) return `<blockquote><p>${html}</p></blockquote>`;
  return `<p>${html}</p>`;
}

/** How many characters of `text` the page shows where `text`'s opening appears on it. */
function shownPrefix(text: string, page: string): number {
  if (text.length < SHARED_OPENING_LENGTH) return 0;
  const at = page.indexOf(text.slice(0, SHARED_OPENING_LENGTH));
  if (at === -1) return 0;
  let length = SHARED_OPENING_LENGTH;
  while (length < text.length && page[at + length] === text[length]) length++;
  return length;
}

/**
 * How much of the candidate's text the page already shows, or 0 when the candidate doesn't
 * open with a paragraph the page shows. Matching the opening, not any paragraph, keeps a
 * comment that quotes the article from tying a comment list to the page.
 */
function shownLength(candidate: Candidate, page: string): number {
  const opening = candidate.blocks.filter((block) => block.normalized).slice(0, OPENING_BLOCKS);
  if (!opening.some((block) => shownPrefix(block.normalized, page))) return 0;
  return candidate.blocks.reduce((sum, block) => sum + shownPrefix(block.normalized, page), 0);
}

export interface PayloadArticle {
  content: string;
  textContent: string;
  /** How much of this text the page itself shows. */
  shownLength: number;
}

export interface PayloadArticles {
  /**
   * The longest candidate that opens with a paragraph `pageText` shows (the article as the page
   * shows it), built as HTML, or null. A candidate that comes out under 500 characters once
   * scripts and embeds are removed is passed over.
   */
  pick(pageText: string): PayloadArticle | null;
  /** How many distinct block lists qualified, for logs and tests. */
  readonly candidates: number;
}

/** The page's payload as a flat array, or null when it has none it can read. */
function readPayload(document: LinkedomDocument): Flat | null {
  for (const [id, toPayload] of [
    ["__NUXT_DATA__", (data: unknown) => (Array.isArray(data) ? { payload: data, roots: [0] } : null)],
    ["__NEXT_DATA__", flatten],
  ] as const) {
    const json = document.querySelector(`script#${id}`)?.textContent ?? "";
    if (!json || json.length > MAX_PAYLOAD_LENGTH) continue;
    try {
      return toPayload(JSON.parse(json));
    } catch {
      // Not JSON; try the next
    }
  }
  return null;
}

/**
 * The article candidates in the page's data payload, or null when the page has none. Must run
 * before the page is cleaned, which may drop the script that holds the payload.
 */
export function findPayloadArticles(document: LinkedomDocument, url: string): PayloadArticles | null {
  const payload = readPayload(document);
  if (!payload) return null;

  const candidates = findCandidates(payload);
  if (!candidates.length) return null;

  return {
    candidates: candidates.length,
    pick(pageText) {
      const page = normalize(pageText);
      for (const candidate of candidates) {
        const shown = shownLength(candidate, page);
        if (!shown) continue;
        const article = build(document, url, candidate);
        if (article.textContent.length >= MIN_ARTICLE_TEXT_LENGTH) return { ...article, shownLength: shown };
      }
      return null;
    },
  };
}

function build(document: LinkedomDocument, url: string, candidate: Candidate): Omit<PayloadArticle, "shownLength"> {
  const container = document.createElement("div");
  container.innerHTML = candidate.blocks
    .filter((block) => block.text || /<img\b/i.test(block.html))
    .map(blockHtml)
    .join("\n");
  container.querySelectorAll(RAW_TEXT_ELEMENTS.join(", ")).forEach((el) => el.remove());
  resolveLazyImages(container);
  const absolutize = (selector: string, attr: string) =>
    container.querySelectorAll(selector).forEach((el) => {
      try {
        el.setAttribute(attr, new URL(el.getAttribute(attr) ?? "", url).href);
      } catch {
        // Leave unparseable URLs as they are
      }
    });
  absolutize("a[href]", "href");
  absolutize("img[src]", "src");

  const textContent = (container.textContent ?? "").replace(/\s+/g, " ").trim();
  return { content: container.innerHTML, textContent };
}
