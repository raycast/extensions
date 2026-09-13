/**
 * Full-text search over Saturn's inverted index: ranked, fuzzy-tolerant, and
 * snippet-aware.
 *
 * Pure functions — no IO — so everything here is fixture-testable. Files are
 * read in lib/saturn.ts; this module only sees data.
 *
 * Ranking contract: title and tag matches always sort above body-only matches
 * (bucket 0 vs 1); within a bucket, score desc, then frecency. Kind weights:
 * exact > prefix (as-you-type) > fuzzy (typos like "compositng" → "compositing").
 */

import type { SaturnLink, SearchIndexData, SearchIndexPosting } from "./saturn";
import { tokenize, tokenizeBody } from "./tokenize";

export const FIELD_TITLE = 1;
export const FIELD_TAG = 2;
export const FIELD_BODY = 4;

/** Title/tag ≫ body — the spec: title and tag matches outweigh body matches. */
const FIELD_WEIGHT: Record<number, number> = {
  [FIELD_TITLE]: 12,
  [FIELD_TAG]: 9,
  [FIELD_BODY]: 1.5,
};
/** Exact > prefix-as-you-type > fuzzy. */
const KIND_MULTIPLIER = [1, 0.75, 0.55] as const;
const ALL_TITLE_EXACT_BONUS = 8;
const MAX_RESULTS = 100;
/** Characters either side of the matched term kept in a body snippet. */
const SNIPPET_RADIUS = 60;
/** Hard cap on a one-line snippet. */
const SNIPPET_WINDOW = 150;

export interface MatchedTerms {
  /** Index terms matched in the title (for bolding). */
  title: string[];
  /** Full tag strings that matched (for chips + bolding). */
  tags: string[];
  /** Index terms matched in the body (for snippet + bolding). */
  bodyTerms: string[];
}

export interface SearchResult {
  link: SaturnLink;
  score: number;
  /** 0 = has title/tag match, 1 = body-only. Bucket 0 always sorts first. */
  bucket: 0 | 1;
  matched: MatchedTerms;
  /**
   * One-line body context. Undefined when the item has no body match OR the
   * sidecar text is momentarily missing (index/sidecar skew) — UI must treat
   * that as "no body context", not render a broken "in page" state.
   */
  snippet?: string;
}

export interface PreparedIndex {
  data: SearchIndexData;
  vocab: string[];
  /** Vocab bucketed by first letter — cheap fuzzy candidate pruning. */
  byFirstLetter: Map<string, string[]>;
}

/** Precomputes vocab structures once per index load, not per keystroke. */
export function prepareIndex(data: SearchIndexData): PreparedIndex {
  const vocab = Object.keys(data.terms);
  const byFirstLetter = new Map<string, string[]>();
  for (const term of vocab) {
    const first = term[0];
    const bucket = byFirstLetter.get(first);
    if (bucket) bucket.push(term);
    else byFirstLetter.set(first, [term]);
  }
  return { data, vocab, byFirstLetter };
}

/**
 * Rare fallback: rebuilds the index in-memory from library metadata + the
 * sidecar when search-index.json is missing/corrupt (e.g. the updated app
 * hasn't run yet). Same tokenizer, same posting shapes as the app.
 */
export function buildIndexFromLibrary(
  links: SaturnLink[],
  pageTexts: Record<string, string>,
): SearchIndexData {
  const terms: Record<string, SearchIndexPosting[]> = {};
  const docs: SearchIndexData["docs"] = {};
  const add = (id: string, tokens: string[], field: number): number => {
    const tf = new Map<string, number>();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    for (const [term, count] of tf) {
      (terms[term] ??= []).push({ id, f: field, t: count });
    }
    return tokens.length;
  };
  for (const link of links) {
    const title = add(link.id, tokenize(link.title), FIELD_TITLE);
    const tags = add(link.id, tokenize((link.tags ?? []).join(" ")), FIELD_TAG);
    const body = add(
      link.id,
      tokenizeBody(pageTexts[link.id] ?? ""),
      FIELD_BODY,
    );
    docs[link.id] = { title, tags, body };
  }
  return { docs, terms };
}

/** Typos tolerated: none under 4 chars, one edit up to 6, two edits beyond. */
function maxDistanceFor(length: number): number {
  if (length < 4) return 0;
  if (length <= 6) return 1;
  return 2;
}

/** Levenshtein with transpositions (OSA) and early exit — returns maxDist+1 as soon as it can't win. */
function boundedLevenshtein(a: string, b: string, maxDist: number): number {
  if (Math.abs(a.length - b.length) > maxDist) return maxDist + 1;
  let prev2: number[] | null = null;
  let prev: number[] = [];
  for (let j = 0; j <= b.length; j++) prev.push(j);
  for (let i = 1; i <= a.length; i++) {
    const cur: number[] = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      // Adjacent transposition ("desing" → "design") counts as one edit.
      if (
        prev2 &&
        i > 1 &&
        j > 1 &&
        a[i - 1] === b[j - 2] &&
        a[i - 2] === b[j - 1]
      ) {
        v = Math.min(v, prev2[j - 2] + cost);
      }
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > maxDist) return maxDist + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

type TermKind = 0 | 1 | 2; // exact | prefix | fuzzy

/**
 * Maps a query token to every index term it can mean: itself (exact), terms
 * it prefixes (typing mid-word), and same-initial terms within edit distance
 * (typos). Fuzzy candidates are pruned by first letter + length difference.
 */
function expandToken(
  token: string,
  index: PreparedIndex,
): Map<string, TermKind> {
  const out = new Map<string, TermKind>();
  if (index.data.terms[token]) out.set(token, 0);

  for (const term of index.vocab) {
    if (
      term.length > token.length &&
      term.startsWith(token) &&
      !out.has(term)
    ) {
      out.set(term, 1);
    }
  }

  const maxDist = maxDistanceFor(token.length);
  if (maxDist > 0) {
    for (const term of index.byFirstLetter.get(token[0]) ?? []) {
      if (out.has(term)) continue;
      if (Math.abs(term.length - token.length) > maxDist) continue;
      if (boundedLevenshtein(token, term, maxDist) <= maxDist) out.set(term, 2);
    }
  }
  return out;
}

interface Accumulator {
  score: number;
  title: Set<string>;
  tagTerms: Set<string>;
  body: Set<string>;
  covered: Set<number>;
}

export function searchLinks(args: {
  links: SaturnLink[];
  index: PreparedIndex;
  pageTexts: Record<string, string>;
  query: string;
  /** Optional frecency order (id → rank) used as the final tie-breaker. */
  frecencyRank?: Map<string, number>;
}): SearchResult[] {
  const qtokens = [...new Set(tokenize(args.query))];
  if (qtokens.length === 0) return [];

  const linksById = new Map(args.links.map((l) => [l.id, l]));
  const acc = new Map<string, Accumulator>();
  const expansionCache = new Map<string, Map<string, TermKind>>();

  qtokens.forEach((qt, qi) => {
    let expanded = expansionCache.get(qt);
    if (!expanded) {
      expanded = expandToken(qt, args.index);
      expansionCache.set(qt, expanded);
    }
    for (const [term, kind] of expanded) {
      const postings = args.index.data.terms[term];
      if (!postings) continue;
      const kindMultiplier = KIND_MULTIPLIER[kind];
      for (const p of postings) {
        if (!linksById.has(p.id)) continue;
        let a = acc.get(p.id);
        if (!a) {
          a = {
            score: 0,
            title: new Set(),
            tagTerms: new Set(),
            body: new Set(),
            covered: new Set(),
          };
          acc.set(p.id, a);
        }
        a.covered.add(qi);
        // Repeated occurrences help, with diminishing returns.
        const tfFactor = 1 + Math.min(p.t - 1, 4) * 0.2;
        if (p.f & FIELD_TITLE) {
          a.score += FIELD_WEIGHT[FIELD_TITLE] * kindMultiplier * tfFactor;
          a.title.add(term);
        }
        if (p.f & FIELD_TAG) {
          a.score += FIELD_WEIGHT[FIELD_TAG] * kindMultiplier * tfFactor;
          a.tagTerms.add(term);
        }
        if (p.f & FIELD_BODY) {
          a.score += FIELD_WEIGHT[FIELD_BODY] * kindMultiplier * tfFactor;
          a.body.add(term);
        }
      }
    }
  });

  const results: SearchResult[] = [];
  for (const [id, a] of acc) {
    const link = linksById.get(id);
    if (!link) continue;

    const coverage = a.covered.size / qtokens.length;
    let score = a.score * (1 + coverage);
    // Whole query lands verbatim in the title — the "I know what I saved" case.
    if (qtokens.every((qt) => a.title.has(qt))) score += ALL_TITLE_EXACT_BONUS;

    const bodyTerms = [...a.body];
    const text = args.pageTexts[id];
    // Graceful skew: index says body match but sidecar text isn't there (yet).
    const snippet =
      bodyTerms.length > 0 && text ? buildSnippet(text, bodyTerms) : undefined;

    const matchedTags = (link.tags ?? []).filter((tag) =>
      tokenize(tag).some((t) => a.tagTerms.has(t)),
    );

    results.push({
      link,
      score,
      bucket: a.title.size > 0 || a.tagTerms.size > 0 ? 0 : 1,
      matched: { title: [...a.title], tags: matchedTags, bodyTerms },
      snippet,
    });
  }

  const rank = args.frecencyRank;
  results.sort(
    (x, y) =>
      x.bucket - y.bucket ||
      y.score - x.score ||
      (rank?.get(x.link.id) ?? Number.MAX_SAFE_INTEGER) -
        (rank?.get(y.link.id) ?? Number.MAX_SAFE_INTEGER),
  );
  return results.slice(0, MAX_RESULTS);
}

/**
 * One-line context around the first matched term: ~SNIPPET_RADIUS chars each
 * side, trimmed to word boundaries, ellipsized where clipped. When no term
 * occurs verbatim (pure fuzzy match), the start of the page is shown.
 */
export function buildSnippet(text: string, terms: string[]): string {
  const flat = text.replace(/\s+/g, " ").trim();
  const lower = flat.toLowerCase();
  let anchor = -1;
  for (const term of terms) {
    const i = lower.indexOf(term.toLowerCase());
    if (i !== -1 && (anchor === -1 || i < anchor)) anchor = i;
  }
  if (anchor === -1) anchor = 0;

  let start = Math.max(0, anchor - SNIPPET_RADIUS);
  let end = Math.min(flat.length, start + SNIPPET_WINDOW);
  if (start > 0) {
    const space = flat.indexOf(" ", start);
    if (space !== -1 && space < anchor) start = space + 1;
  }
  if (end < flat.length) {
    const space = flat.lastIndexOf(" ", end);
    if (space > start) end = space;
  }
  return (
    (start > 0 ? "…" : "") +
    flat.slice(start, end) +
    (end < flat.length ? "…" : "")
  );
}

// ── Highlight rendering (detail panel markdown) ──────────────────────────

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeMarkdown(s: string): string {
  return s.replace(/[\\`*_[\]]/g, "\\$&");
}

/** Bolds (markdown) every occurrence of the given terms, longest first. */
export function boldTerms(text: string, terms: string[]): string {
  const escaped = escapeMarkdown(text);
  const uniq = [...new Set(terms.filter((t) => t.length > 0))].sort(
    (a, b) => b.length - a.length,
  );
  if (uniq.length === 0) return escaped;
  const re = new RegExp(`(${uniq.map(escapeRegExp).join("|")})`, "giu");
  return escaped.replace(re, "**$1**");
}

function fileUrlFor(path: string): string {
  return `file://${encodeURI(path)}`;
}

/**
 * Detail-panel markdown body, deliberately sparse: the preview thumbnail at a
 * fixed height (`raycast-height` keeps it from filling the panel), then — for
 * body matches only — the one-line snippet with matched terms bolded in place.
 * Title/tags/dates live in the Detail.Metadata block, and the "in page" state
 * is the row accessory's job; nothing is duplicated between body, row, and
 * metadata. Works for plain browse rows too — pass only `{ link }`.
 */
export function buildDetailMarkdown(
  result: Pick<SearchResult, "link"> &
    Partial<Pick<SearchResult, "matched" | "snippet">>,
): string {
  const { link, matched, snippet } = result;
  const parts: string[] = [];
  if (link.previewImagePath) {
    parts.push(`![](${fileUrlFor(link.previewImagePath)}?raycast-height=280)`);
  }
  if (snippet) {
    parts.push(boldTerms(snippet, matched?.bodyTerms ?? []));
  }
  return parts.join("\n\n");
}
