/**
 * Parsers for an open-slide static build.
 *
 * A deployed deck index only exists inside the JS bundle: `open-slide build`
 * compiles `virtual:open-slide/slides` into the entry chunk as
 *
 *   IDS=["deck-a","deck-b"],THEMES={"deck-a":"corporate"},CREATED={"deck-a":1777e9},
 *   async function load(e){switch(e){case"deck-a":return p(()=>import("./deck-a-HASH.js"),…)
 *
 * and each deck chunk ends with an ESM export table that names its bindings:
 *
 *   META={title:"Deck A"},PAGES=[a,b,c];export{PAGES as default,META as meta,NOTES as notes}
 *
 * Minifier settings differ between builds — demo.open-slide.dev quotes with
 * backticks, slides.raycast.tw with double quotes — so nothing here may assume
 * a quote style, and string values are read with a scanner rather than a regex
 * (titles contain apostrophes: `Next.js: PPR & 'use cache'`).
 */

const QUOTES = new Set(['"', "'", "`"]);
const OPENERS = new Set(["[", "{", "("]);
const CLOSERS = new Set(["]", "}", ")"]);

function escapeRe(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const SIMPLE_ESCAPES: Record<string, string> = {
  n: "\n",
  t: "\t",
  r: "\r",
  b: "\b",
  f: "\f",
  v: "\v",
  0: "\0",
};

/**
 * Decodes the escape sequence whose backslash sits at `i`, returning the
 * decoded text and the index just past the sequence.
 */
function readEscapeAt(src: string, i: number): { value: string; end: number } {
  const ch = src[i + 1];
  if (ch === undefined) return { value: "", end: i + 1 };

  if (ch in SIMPLE_ESCAPES && !(ch === "0" && /[0-9]/.test(src[i + 2] ?? ""))) {
    return { value: SIMPLE_ESCAPES[ch], end: i + 2 };
  }

  if (ch === "x") {
    const hex = src.slice(i + 2, i + 4);
    if (/^[0-9a-fA-F]{2}$/.test(hex)) return { value: String.fromCharCode(parseInt(hex, 16)), end: i + 4 };
  }

  if (ch === "u") {
    if (src[i + 2] === "{") {
      const close = src.indexOf("}", i + 3);
      const hex = close === -1 ? "" : src.slice(i + 3, close);
      if (/^[0-9a-fA-F]{1,6}$/.test(hex)) {
        const point = parseInt(hex, 16);
        if (point <= 0x10ffff) return { value: String.fromCodePoint(point), end: close + 1 };
      }
    } else {
      const hex = src.slice(i + 2, i + 6);
      if (/^[0-9a-fA-F]{4}$/.test(hex)) return { value: String.fromCharCode(parseInt(hex, 16)), end: i + 6 };
    }
  }

  // Line continuation: a backslash before a newline joins the lines.
  if (ch === "\r" && src[i + 2] === "\n") return { value: "", end: i + 3 };
  if (ch === "\n" || ch === "\r" || ch === "\u2028" || ch === "\u2029") return { value: "", end: i + 2 };

  // Anything else (`\\`, `\"`, `\'`, `` \` ``, `\/`, …) is the character itself.
  return { value: ch, end: i + 2 };
}

/** Reads the string literal starting at `i`, decoding escapes. */
function readStringAt(src: string, i: number): { value: string; end: number } | null {
  const quote = src[i];
  if (!QUOTES.has(quote)) return null;
  let value = "";
  for (let j = i + 1; j < src.length; j++) {
    const ch = src[j];
    if (ch === "\\") {
      const esc = readEscapeAt(src, j);
      value += esc.value;
      j = esc.end - 1;
      continue;
    }
    if (ch === quote) return { value, end: j + 1 };
    value += ch;
  }
  return null;
}

/** Index just past the bracket opened at `start`, skipping nested strings. */
function matchBracket(src: string, start: number, limit = 20000): number {
  const open = src[start];
  if (!OPENERS.has(open)) return -1;
  let depth = 0;
  const end = Math.min(src.length, start + limit);
  for (let i = start; i < end; i++) {
    const ch = src[i];
    if (QUOTES.has(ch)) {
      const str = readStringAt(src, i);
      if (!str) return -1;
      i = str.end - 1;
      continue;
    }
    if (OPENERS.has(ch)) depth++;
    else if (CLOSERS.has(ch)) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/** String literals that are direct elements of the array at `[open, close)`. */
function topLevelStrings(src: string, open: number, close: number): string[] {
  const strings: string[] = [];
  let depth = 0;

  for (let i = open; i < close; i++) {
    const ch = src[i];
    if (QUOTES.has(ch)) {
      const str = readStringAt(src, i);
      if (!str) break;
      if (depth === 1) strings.push(str.value);
      i = str.end - 1;
      continue;
    }
    if (OPENERS.has(ch)) depth++;
    else if (CLOSERS.has(ch)) depth--;
  }

  return strings;
}

/** `{"a":"b",c:1}` → `{ a: "b", c: 1 }`. Keys may or may not be quoted. */
function parseObjectLiteral(src: string): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const re = /(?:(["'`])([^"'`]+)\1|([A-Za-z_$][\w$]*))\s*:\s*(?:(["'`])([^"'`]*)\4|(-?[\d.]+(?:e[+-]?\d+)?))/gi;
  for (const m of src.matchAll(re)) {
    const key = m[2] ?? m[3];
    if (!key) continue;
    out[key] = m[5] !== undefined ? m[5] : Number(m[6]);
  }
  return out;
}

export type SlidesModule = {
  /** slide id → chunk filename, relative to the entry chunk's folder. */
  chunks: Record<string, string>;
  themes: Record<string, string>;
  createdAt: Record<string, number>;
};

// `case"deck-a":return p(()=>import("./deck-a-HASH.js"),__vite__mapDeps([0,1]))`
const CASE_RE = /case\s*(["'`])([A-Za-z0-9._-]+)\1\s*:\s*return[\s\S]{0,60}?import\(\s*(["'`])([^"'`]+)\3/g;
// An array of plain string literals — the compiled `slideIds`.
const ID_ARRAY_RE = /\[(?:\s*(["'`])[A-Za-z0-9._-]+\1\s*,)*\s*(["'`])[A-Za-z0-9._-]+\2\s*\]/g;

/**
 * Recovers the deck index from the entry chunk.
 *
 * Theme demos (`themes/<id>.demo.tsx`) compile to a sibling switch, so ids are
 * cross-checked against the `slideIds` array and `.demo-` chunks are dropped.
 */
export function parseSlidesModule(main: string): SlidesModule {
  const cases: Record<string, string> = {};
  for (const m of main.matchAll(CASE_RE)) {
    cases[m[2]] = m[4].replace(/^\.?\//, "");
  }
  const deckIds = Object.keys(cases).filter((id) => !cases[id].includes(".demo-"));
  if (deckIds.length === 0) {
    throw new Error("no slide modules found in the entry chunk");
  }

  // Pick the string array overlapping the switch cases the most — that is
  // `slideIds`, and it tells us where `slideThemes`/`slideCreatedAt` sit.
  let best: { ids: string[]; overlap: number; end: number } | null = null;
  for (const m of main.matchAll(ID_ARRAY_RE)) {
    const end = m.index + m[0].length;
    const strings = topLevelStrings(main, m.index, end);
    const overlap = strings.filter((id) => deckIds.includes(id)).length;
    if (overlap > 0 && (!best || overlap > best.overlap)) {
      best = { ids: strings, overlap, end };
    }
  }

  const ids = best ? best.ids.filter((id) => id in cases) : deckIds;
  const chunks: Record<string, string> = {};
  for (const id of ids) chunks[id] = cases[id];

  // `slideThemes` and `slideCreatedAt` are the next two object literals.
  const themes: Record<string, string> = {};
  const createdAt: Record<string, number> = {};
  if (best) {
    let cursor = best.end;
    for (const target of ["themes", "createdAt"] as const) {
      const open = main.indexOf("{", cursor);
      if (open === -1 || open > cursor + 32) break;
      const close = matchBracket(main, open);
      if (close === -1) break;
      for (const [key, value] of Object.entries(parseObjectLiteral(main.slice(open, close)))) {
        if (!(key in chunks)) continue;
        if (target === "themes" && typeof value === "string") themes[key] = value;
        if (target === "createdAt" && typeof value === "number") createdAt[key] = value;
      }
      cursor = close;
    }
  }

  return { chunks, themes, createdAt };
}

/** open-slide lets a folder carry either an emoji or a colour swatch. */
export type FolderIcon = { kind: "emoji"; value: string } | { kind: "color"; value: string };

export type Folder = { name: string; icon: FolderIcon | null };

export type FoldersManifest = {
  /** slide id → the folder the author filed it under. */
  byDeck: Record<string, Folder>;
};

// `{folders:[{id:"f-3ed31a46",name:"motion",icon:{type:"emoji",value:"⚡"}}],assignments:{"deck":"f-3ed31a46"}}`
const FOLDERS_RE = /\{\s*folders\s*:\s*\[/g;

/**
 * Recovers the sidebar folders the deck author arranged in open-slide.
 *
 * `slides/.folders.json` is compiled into the entry chunk as
 * `virtual:open-slide/folders`, so a site carries its own organisation.
 */
export function parseFolders(main: string): FoldersManifest {
  const empty: FoldersManifest = { byDeck: {} };

  for (const m of main.matchAll(FOLDERS_RE)) {
    const close = matchBracket(main, m.index, 20000);
    if (close === -1) continue;

    const entries = objectEntries(main, m.index, close);
    const folders = entries.find((entry) => entry.key === "folders");
    const assignments = entries.find((entry) => entry.key === "assignments");
    if (!folders || !assignments || main[assignments.start] !== "{") continue;

    // id → folder, reading the array in author order.
    const byId = new Map<string, Folder>();
    const arrayClose = matchBracket(main, folders.start, 20000);
    if (arrayClose === -1) continue;

    for (const [start, end] of elementSpans(main, folders.start, arrayClose)) {
      const open = main.indexOf("{", start);
      if (open === -1 || open >= end) continue;
      const objectClose = matchBracket(main, open, 4000);
      if (objectClose === -1) continue;

      let id: string | null = null;
      let name: string | null = null;
      let icon: FolderIcon | null = null;
      for (const field of objectEntries(main, open, objectClose)) {
        const raw = main.slice(field.start, field.end).trim();
        if (field.key === "id" && QUOTES.has(raw[0])) id = raw.slice(1, -1);
        if (field.key === "name" && QUOTES.has(raw[0])) name = raw.slice(1, -1);
        if (field.key === "icon" && raw[0] === "{") {
          const value = raw.match(new RegExp(`value\\s*:\\s*(["'\`])([^"'\`]*)\\1`))?.[2];
          const kind = raw.match(new RegExp(`type\\s*:\\s*(["'\`])([^"'\`]*)\\1`))?.[2];
          if (value && (kind === "emoji" || kind === "color")) icon = { kind, value };
        }
      }
      if (!id || !name) continue;
      byId.set(id, { name, icon });
    }
    if (byId.size === 0) continue;

    const assignmentsClose = matchBracket(main, assignments.start, 20000);
    if (assignmentsClose === -1) continue;

    const byDeck: Record<string, Folder> = {};
    for (const [deckId, folderId] of Object.entries(
      parseObjectLiteral(main.slice(assignments.start, assignmentsClose)),
    )) {
      const folder = typeof folderId === "string" ? byId.get(folderId) : undefined;
      if (folder) byDeck[deckId] = folder;
    }
    if (Object.keys(byDeck).length > 0) return { byDeck };
  }

  return empty;
}

export type DeckChunk = {
  title: string | null;
  pageCount: number | null;
  /**
   * Index-aligned with the pages: `null` where the deck left a hole
   * (`export const notes = ['a', undefined, 'c']` compiles to `["a",void 0,"c"]`).
   */
  notes: (string | null)[];
  /** Text per page, in display order. */
  pages: string[][];
  /** Every string the deck renders, for full-text search. */
  text: string[];
};

const TEXT_BUDGET = 12000;
const PAGE_BLOCK_CAP = 40;

// Tags that sit inside a line of copy rather than starting a new one, so a
// heading split across `["How ", <span>SSH</span>, " actually works."]` reads
// back as one block instead of three.
const INLINE_TAGS = new Set([
  "span",
  "em",
  "strong",
  "b",
  "i",
  "u",
  "a",
  "code",
  "mark",
  "small",
  "sup",
  "sub",
  "br",
  "kbd",
  "abbr",
  "q",
  "cite",
  "s",
  "del",
  "ins",
  "time",
  "samp",
  "var",
  "wbr",
]);
// Props decks use to pass copy into shared components. `alt` is deliberately
// absent: it describes an image rather than what the slide says, and it tends
// to lead a page ("open-slide logo") ahead of the real headline.
const TEXT_PROPS = new Set(["text", "label", "title", "caption", "heading", "subtitle"]);
// SVG accessibility nodes. Their text never renders on the canvas - it is a
// tooltip for assistive tech ("decorative grid") - so it is not slide copy.
const A11Y_TAGS = new Set(["title", "desc"]);
// `title` counts as copy only on a component (`<Card title="How to install" />`).
// On a plain element it is an accessibility description or a tooltip
// ("decorative grid"), which is not what the slide says.
const COMPONENT_ONLY_PROPS = new Set(["title"]);

// `(0,n.jsx)("div",{…})`, `n.jsxs(Component,{…})`, `jsx(\`h1\`,{…})`
const CALL_RE = /jsxs?\s*\)?\s*\(\s*(?:(["'`])([^"'`]+)\1|([A-Za-z_$][\w$]*))\s*,\s*\{/g;

function isCopy(value: string): string | null {
  const text = value.replace(/\s+/g, " ").trim();
  if (text.length < 2) return null;
  // `<style>{…}</style>` blocks and lone CSS values share the `children:`
  // shape but are not slide copy.
  if (text.includes("{") && text.includes("}")) return null;
  // Anchored, and a bare number is kept: decks show counts and years as copy
  // ("6,105", "2026"), so only values carrying a CSS unit are dropped.
  if (/^[\d.]+(?:px|em|rem|%|vh|vw|s|ms)$/i.test(text)) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(text)) return null;
  if (/^(?:var|rgba?|hsla?|calc|url)\(/i.test(text)) return null;
  return text;
}

/** Index just past the value starting at `i`, stopping at this level's end. */
function skipValue(code: string, i: number, limit: number): number {
  let depth = 0;
  for (; i < limit; i++) {
    const ch = code[i];
    if (QUOTES.has(ch)) {
      const str = readStringAt(code, i);
      if (!str) return limit;
      i = str.end - 1;
      continue;
    }
    if (OPENERS.has(ch)) depth++;
    else if (CLOSERS.has(ch)) {
      if (depth === 0) return i;
      depth--;
    } else if (ch === "," && depth === 0) return i;
  }
  return limit;
}

type Entry = { key: string; start: number; end: number };

/** Top-level `key: value` pairs of the object bracketed by `[open, close)`. */
function objectEntries(code: string, open: number, close: number): Entry[] {
  const entries: Entry[] = [];
  let i = open + 1;

  while (i < close - 1) {
    while (i < close && /[\s,]/.test(code[i])) i++;
    if (i >= close - 1) break;

    let key: string;
    if (QUOTES.has(code[i])) {
      const str = readStringAt(code, i);
      if (!str) break;
      key = str.value;
      i = str.end;
    } else {
      const m = /^[A-Za-z_$][\w$]*/.exec(code.slice(i, i + 64));
      if (!m) {
        i = skipValue(code, i, close - 1) + 1;
        continue;
      }
      key = m[0];
      i += m[0].length;
    }

    while (i < close && /\s/.test(code[i])) i++;
    if (code[i] !== ":") {
      i = skipValue(code, i, close - 1) + 1;
      continue;
    }
    i++;
    while (i < close && /\s/.test(code[i])) i++;

    const end = skipValue(code, i, close - 1);
    entries.push({ key, start: i, end });
    i = end + 1;
  }

  return entries;
}

type Call = {
  tag: string | null;
  start: number;
  propsOpen: number;
  propsClose: number;
  children: Entry | null;
  props: Entry[];
  kids: Call[];
};

/** Every JSX call in `[from, to)`, nested by containment. */
function buildTree(code: string, from: number, to: number): Call[] {
  const calls: Call[] = [];
  CALL_RE.lastIndex = 0;

  for (const m of code.slice(from, to).matchAll(CALL_RE)) {
    const start = from + m.index;
    const propsOpen = from + m.index + m[0].length - 1;
    const propsClose = matchBracket(code, propsOpen, 40000);
    if (propsClose === -1) continue;
    const entries = objectEntries(code, propsOpen, propsClose);
    calls.push({
      tag: m[2] ?? null,
      start,
      propsOpen,
      propsClose,
      children: entries.find((entry) => entry.key === "children") ?? null,
      props: entries.filter((entry) => TEXT_PROPS.has(entry.key)),
      kids: [],
    });
  }

  // A call nests under the innermost `children` value that contains it.
  const roots: Call[] = [];
  for (const call of calls) {
    let parent: Call | null = null;
    for (const candidate of calls) {
      if (candidate === call || !candidate.children) continue;
      if (call.start <= candidate.children.start || call.start >= candidate.children.end) continue;
      if (!parent || candidate.children.start > parent.children!.start) parent = candidate;
    }
    if (parent) parent.kids.push(call);
    else roots.push(call);
  }

  return roots;
}

/**
 * Reads a span as ordered blocks of copy.
 *
 * Text accumulates across inline elements and flushes at every block boundary,
 * so each block is one line as an audience would read it, in document order.
 */
function extractBlocks(code: string, from: number, to: number): string[] {
  const blocks: string[] = [];
  const seen = new Set<string>();
  let buffer = "";

  const flush = () => {
    const copy = isCopy(buffer);
    if (copy && !seen.has(copy)) {
      seen.add(copy);
      blocks.push(copy);
    }
    buffer = "";
  };

  const walk = (call: Call) => {
    if (call.tag && A11Y_TAGS.has(call.tag)) return;

    for (const prop of call.props) {
      // `call.tag` is set for HTML elements and null for components.
      if (COMPONENT_ONLY_PROPS.has(prop.key) && call.tag !== null) continue;
      if (!QUOTES.has(code[prop.start])) continue;
      const str = readStringAt(code, prop.start);
      const copy = str && isCopy(str.value);
      if (copy && !seen.has(copy)) {
        flush();
        seen.add(copy);
        blocks.push(copy);
      }
    }

    if (!call.children) return;
    const { start } = call.children;

    // Direct strings and child elements, interleaved in source order.
    type Item = { at: number; text?: string; call?: Call };
    const items: Item[] = call.kids.map((kid) => ({ at: kid.start, call: kid }));

    if (QUOTES.has(code[start])) {
      const str = readStringAt(code, start);
      if (str) items.push({ at: start, text: str.value });
    } else if (code[start] === "[") {
      const close = matchBracket(code, start, 40000);
      if (close !== -1) {
        let depth = 0;
        for (let i = start; i < close; i++) {
          const ch = code[i];
          if (QUOTES.has(ch)) {
            const str = readStringAt(code, i);
            if (!str) break;
            if (depth === 1) items.push({ at: i, text: str.value });
            i = str.end - 1;
            continue;
          }
          if (OPENERS.has(ch)) depth++;
          else if (CLOSERS.has(ch)) depth--;
        }
      }
    }

    items.sort((a, b) => a.at - b.at);
    for (const item of items) {
      if (item.text !== undefined) {
        buffer += item.text;
        continue;
      }
      const kid = item.call!;
      if (kid.tag && INLINE_TAGS.has(kid.tag)) {
        buffer += " ";
        walk(kid);
        continue;
      }
      flush();
      walk(kid);
      flush();
    }
  };

  for (const root of buildTree(code, from, to)) {
    walk(root);
    flush();
  }

  return blocks;
}

/** Local components a span renders, so their copy can be pulled in too. */
function referencedComponents(code: string, from: number, to: number): string[] {
  const names = new Set<string>();
  for (const m of code.slice(from, to).matchAll(/jsxs?\)?\(\s*([A-Za-z_$][\w$]*)\s*,/g)) {
    names.add(m[1]);
  }
  return [...names];
}

/** Top-level element spans of the array bracketed by `[open, close)`. */
function elementSpans(code: string, open: number, close: number): Array<[number, number]> {
  const spans: Array<[number, number]> = [];
  let depth = 0;
  let start = open + 1;

  for (let i = open; i < close; i++) {
    const ch = code[i];
    if (QUOTES.has(ch)) {
      const str = readStringAt(code, i);
      if (!str) break;
      i = str.end - 1;
      continue;
    }
    if (OPENERS.has(ch)) {
      depth++;
      continue;
    }
    if (CLOSERS.has(ch)) {
      depth--;
      // `[]` and a trailing comma (`[a,]`) leave nothing after the last
      // separator; JS gives those arrays no extra element either. Holes
      // between commas (`[a,,b]`) are kept so indexes stay aligned.
      if (depth === 0 && code.slice(start, i).trim() !== "") spans.push([start, i]);
      continue;
    }
    if (ch === "," && depth === 1) {
      spans.push([start, i]);
      start = i + 1;
    }
  }

  return spans;
}

/** Span of the value assigned to `name`, taking the last definition before `before`. */
function bindingSpan(code: string, name: string, before: number): [number, number] | null {
  const re = new RegExp(`(?:^|[,;{}()\\s])${escapeRe(name)}\\s*=`, "g");
  let start = -1;
  for (const m of code.matchAll(re)) {
    if (m.index >= before) break;
    start = m.index + m[0].length;
  }
  if (start === -1) return null;

  let depth = 0;
  for (let i = start; i < code.length; i++) {
    const ch = code[i];
    if (QUOTES.has(ch)) {
      const str = readStringAt(code, i);
      if (!str) break;
      i = str.end - 1;
      continue;
    }
    if (OPENERS.has(ch)) depth++;
    else if (CLOSERS.has(ch)) depth--;
    else if ((ch === "," || ch === ";") && depth === 0) return [start, i];
  }
  return null;
}

/** Locates `<binding> = <bracket>` and returns the bracket's span. */
function findAssignedBracket(code: string, binding: string, bracket: "[" | "{"): [number, number] | null {
  const re = new RegExp(`${escapeRe(binding)}\\s*=\\s*\\${bracket}`, "g");
  let found: [number, number] | null = null;
  for (const m of code.matchAll(re)) {
    const open = code.indexOf(bracket, m.index);
    const close = matchBracket(code, open);
    if (close !== -1) found = [open, close];
  }
  return found;
}

const FURNITURE_MIN_PAGES = 4;
const FURNITURE_SHARE = 0.5;

/**
 * Drops running headers and footers.
 *
 * A deck's page furniture - a footer, a section marker, a slide counter -
 * repeats on most pages, and in a summary it crowds out the copy that makes
 * one page different from the next.
 */
function stripFurniture(pages: string[][]): void {
  if (pages.length < FURNITURE_MIN_PAGES) return;

  const counts = new Map<string, number>();
  for (const page of pages) {
    for (const line of new Set(page)) counts.set(line, (counts.get(line) ?? 0) + 1);
  }

  const threshold = pages.length * FURNITURE_SHARE;
  const furniture = new Set([...counts].filter(([, count]) => count > threshold).map(([line]) => line));
  if (furniture.size === 0) return;

  for (let index = 0; index < pages.length; index++) {
    pages[index] = pages[index].filter((line) => !furniture.has(line));
  }
}

/** Reads title, pages, speaker notes and searchable text out of a deck chunk. */
export function parseDeckChunk(code: string): DeckChunk {
  const exports = code.match(/export\s*\{([^}]*)\}/)?.[1] ?? "";
  const binding = (name: string) => exports.match(new RegExp(`([A-Za-z_$][\\w$]*)\\s+as\\s+${name}\\b`))?.[1] ?? null;

  const metaBind = binding("meta");
  const defaultBind = binding("default");
  const notesBind = binding("notes");

  let title: string | null = null;
  if (metaBind) {
    const span = findAssignedBracket(code, metaBind, "{");
    if (span) {
      const at = code.slice(span[0], span[1]).search(/\btitle\s*:\s*/);
      if (at !== -1) {
        const valueAt = span[0] + at + code.slice(span[0] + at).search(/(?<=title\s*:\s*)\S/);
        title = readStringAt(code, valueAt)?.value.trim() || null;
      }
    }
  }

  // The default export is `Page[]`. Each element is either an identifier
  // pointing at a component defined earlier in the chunk, or an inline arrow
  // component — both give a span to read that page's copy from.
  const pages: string[][] = [];
  if (defaultBind) {
    const span = findAssignedBracket(code, defaultBind, "[");
    if (span) {
      let budget = TEXT_BUDGET;
      for (const [start, end] of elementSpans(code, span[0], span[1])) {
        const raw = code.slice(start, end).trim();
        const target = /^[A-Za-z_$][\w$]*$/.test(raw)
          ? bindingSpan(code, raw, span[0])
          : ([start, end] as [number, number]);
        if (!target) {
          pages.push([]);
          continue;
        }

        const copy = new Set(budget > 0 ? extractBlocks(code, target[0], target[1]) : []);
        // Pages often delegate to a shared component defined in the same
        // chunk; follow one level so those pages are not blank.
        for (const ref of referencedComponents(code, target[0], target[1])) {
          const refSpan = bindingSpan(code, ref, span[0]);
          if (!refSpan) continue;
          if (budget > 0) for (const value of extractBlocks(code, refSpan[0], refSpan[1])) copy.add(value);
        }
        const blocks = [...copy].slice(0, PAGE_BLOCK_CAP);
        budget -= blocks.join("").length;
        pages.push(blocks);
      }
    }
  }

  stripFurniture(pages);

  let notes: (string | null)[] = [];
  if (notesBind) {
    const span = findAssignedBracket(code, notesBind, "[");
    if (span) {
      notes = elementSpans(code, span[0], span[1]).map(([start, end]) => {
        const raw = code.slice(start, end).trim();
        if (!raw || !QUOTES.has(raw[0])) return null;
        return readStringAt(raw, 0)?.value ?? null;
      });
    }
  }

  return {
    title,
    pageCount: pages.length > 0 ? pages.length : null,
    notes,
    pages,
    // Searched separately from `pages` so copy living in shared components
    // still matches even when it cannot be attributed to one page.
    text: extractBlocks(code, 0, code.length).slice(0, 400),
  };
}
