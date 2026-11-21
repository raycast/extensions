// What a query asks each engine for, and how their answers become one list. No Raycast imports, so it tests in plain Node.

export type Engine = "fsearch" | "digup";

/** A fsearch name hit, or one file of a fsearch content search. */
export type FsearchHit = {
  path: string;
  kind: string;
  mtime: number;
  size: number;
  score: number;
  /** Content search: the first matching lines. */
  lines?: { line: number; text: string }[];
};

/** A DigUp hit: one segment of a file (a page, a moment, a passage, a picture, a code stretch). */
export type DigupHit = {
  path: string;
  kind: string;
  segment: string;
  segment_id: number;
  score: number;
  cosine?: number;
  z?: number;
  keyword_rank?: number;
  loc?: number;
  loc_end?: number;
  focus?: number;
  excerpt?: string;
  modified: number;
  size: number;
  info: Record<string, string>;
};

export type Plan = {
  /** fsearch query (its own syntax), or null to skip it. */
  fsearch: string | null;
  /** DigUp text, or null to skip it. */
  digup: string | null;
  code: boolean;
  /** Which section leads: a sentence reads as a description, a word or two as a name. */
  lead: Engine;
};

const FSEARCH_FILTER = /(^|\s)!?(ext|type|kind|in|size|mtime|re|path|grep|regex|sym|content|symbol|limit|git):/i;
const FSEARCH_SYNTAX = /(^|\s)['^!]|\$(\s|$)|[*?{}]/;

export function plan(raw: string): Plan {
  const text = raw.trim();
  if (!text) return { fsearch: null, digup: null, code: false, lead: "fsearch" };
  const code = /^code:\s*/i.exec(text);
  if (code) {
    const rest = text.slice(code[0].length).trim();
    return { fsearch: null, digup: rest ? `code: ${rest}` : null, code: true, lead: "digup" };
  }
  // fsearch's filters and operators mean nothing to DigUp: such a query is for fsearch alone.
  if (FSEARCH_FILTER.test(text) || FSEARCH_SYNTAX.test(text)) {
    return { fsearch: text, digup: null, code: false, lead: "fsearch" };
  }
  const words = text.split(/\s+/).length;
  // A single short token ("main.rs", "invoice") is almost always a name; DigUp still runs for its exact-word index.
  return { fsearch: text, digup: text, code: false, lead: words >= 3 ? "digup" : "fsearch" };
}

/** DigUp's hits with fsearch's, each file once: a file both found keeps DigUp's row (it knows the page or moment). */
export function merge(digup: DigupHit[], fsearch: FsearchHit[]): { digup: DigupHit[]; fsearch: FsearchHit[] } {
  const seen = new Set<string>();
  const meaning: DigupHit[] = [];
  for (const hit of digup) {
    if (seen.has(hit.path)) continue;
    seen.add(hit.path);
    meaning.push(hit);
  }
  return { digup: meaning, fsearch: fsearch.filter((hit) => !seen.has(hit.path)) };
}

/** 83 → "1:23", 3725 → "1:02:05". */
export function clock(seconds: number): string {
  const total = Math.max(0, Math.floor(seconds));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${s}` : `${m}:${s}`;
}

/** Where in the file a DigUp hit points, for people: "p. 4", "1:23", "line 120". */
export function where(hit: DigupHit): string | undefined {
  if (hit.loc === undefined) return undefined;
  switch (hit.kind) {
    case "pdf":
      return `p. ${Math.round(hit.loc)}`;
    case "audio":
    case "video":
      return clock(hit.loc);
    case "code":
      return `line ${Math.round(hit.focus ?? hit.loc)}`;
    default:
      return undefined;
  }
}

/** The default scope and exclusions, unless the query names its own folder. */
export function scoped(q: string, defaults: string): string {
  return defaults.trim() && !/(^|\s)in:/i.test(q) ? `${q} ${defaults.trim()}` : q;
}

export function tilde(path: string, home: string): string {
  return path === home || path.startsWith(home + "/") ? "~" + path.slice(home.length) : path;
}
