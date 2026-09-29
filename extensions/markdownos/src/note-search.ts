// Search, ranking, and preview logic, ported from main/handlers/vault.ts so results
// here rank the same way they do inside MarkdownOS itself.
//
// This deliberately does NOT use Raycast's built-in list filtering. That filter is fuzzy
// (subsequence) matching over an item's title and `keywords`, which is right for a short command
// list and wrong for note bodies: handing it a whole note as a keyword makes a query like "olive"
// match any note containing o…l…i…v…e scattered across thousands of characters, and makes every
// keystroke scan every body. Scoring here instead is both faster (the haystacks are lowercased
// once at load, so a keystroke is a handful of indexOf calls per note) and matches the app.

// Type-only, so this stays a compile-time reference and the two modules don't form a runtime
// import cycle (notes.ts imports straightenQuotes from here).
import type { Note } from "./notes";

/** Folds curly quotes to straight ones for MATCHING only. One character in, one out — so every
 *  index found in a folded string is still valid against the original, which is what lets a
 *  match found here point at the right place in the untouched display text. Ported verbatim. */
export function straightenQuotes(text: string): string {
  return text.replace(/[‘’‚‛]/g, "'").replace(/[“”„‟]/g, '"');
}

/**
 * Splits a raw query into the terms every result must contain: `"quoted runs"` stay whole,
 * everything else splits on whitespace, terms are ANDed and order-independent.
 *
 * Quote characters are stripped rather than kept, which is what makes a half-typed phrase behave:
 * mid-typing, `"weeknight pasta"` passes through as `"weeknight`, and left as-is that term matches
 * nothing and the results blank out until the closing quote lands.
 */
export function parseSearchTerms(query: string): string[] {
  const terms: string[] = [];
  const pattern = /"([^"]+)"|(\S+)/g;
  let match: RegExpExecArray | null;
  const straightened = straightenQuotes(query);
  while ((match = pattern.exec(straightened)) !== null) {
    const term = (match[1] ?? match[2]).replace(/"/g, "").trim().toLowerCase();
    if (term) terms.push(term);
  }
  // Deduplicated so `pasta pasta` doesn't score double for what the user typed once.
  return [...new Set(terms)];
}

/** True when `index` starts a word, used to rank "matched the start of a word" above "matched
 *  inside one" — so searching `note` puts "Note taking" above "Keynote". */
function isWordStart(haystack: string, index: number): boolean {
  if (index === 0) return true;
  return !/[\p{L}\p{N}]/u.test(haystack[index - 1]);
}

function scoreNote(note: Note, terms: string[], normalizedQuery: string): number | null {
  let score = 0;
  for (const term of terms) {
    const titleIndex = note.titleLower.indexOf(term);
    if (titleIndex !== -1) {
      score += 100;
      if (titleIndex === 0) score += 50;
      else if (isWordStart(note.titleLower, titleIndex)) score += 25;
      continue;
    }
    const bodyIndex = note.bodyLower.indexOf(term);
    // AND semantics: one term nowhere in either field disqualifies the note outright.
    if (bodyIndex === -1) return null;
    score += 10;
    if (isWordStart(note.bodyLower, bodyIndex)) score += 5;
  }
  if (note.titleLower === normalizedQuery) score += 1000;
  else if (note.titleLower.startsWith(normalizedQuery)) score += 200;
  return score;
}

export function searchNotes(notes: Note[], query: string): Note[] {
  const terms = parseSearchTerms(query);
  if (terms.length === 0) return notes;
  const normalizedQuery = straightenQuotes(query.trim()).toLowerCase();

  const scored: { note: Note; score: number }[] = [];
  for (const note of notes) {
    const score = scoreNote(note, terms, normalizedQuery);
    if (score !== null) scored.push({ note, score });
  }
  // `notes` arrives sorted newest-first and Array.sort is stable, so equal scores keep that
  // order — no tiebreak comparison needed here.
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.note);
}

/* ── Preview ───────────────────────────────────────────────────────────────────────────────── */

/*
 * The preview marks nothing: it only scrolls to the first match (see trimToMatch).
 *
 * Matches used to be wrapped as inline code, the one thing Raycast's Detail view draws with a
 * background — it renders CommonMark and strips HTML, so `<mark>` shows as plain text. But inline
 * code also switches to a smaller monospace face, so a matched word visibly jumped out of its line,
 * worst of all in the title heading. Bold is the only mark that leaves the line alone, and it can't
 * show inside a heading, which is already bold. With nothing that marks a match without breaking
 * the layout, the preview doesn't mark matches at all.
 */

// Roughly how much text the detail pane shows before it starts scrolling, and how much text to
// keep in front of the match so it reads in context rather than starting abruptly. Both are
// estimates — Raycast exposes no way to ask the pane its size — so they're deliberately loose.
const VISIBLE_HEAD_CHARS = 400;
const CONTEXT_CHARS = 180;

/** Lines whose leading characters carry meaning (a heading's `#`, a list's `-`, a table row's
 *  `|`), which a cut inside the line would silently strip — turning a heading into body text. */
function isPlainParagraphLine(line: string): boolean {
  return !/^\s*(?:#{1,6}\s|[-*+]\s|\d+\.\s|>|\||```)/.test(line);
}

function countOccurrences(text: string, needle: string): number {
  let count = 0;
  let from = 0;
  for (;;) {
    const index = text.indexOf(needle, from);
    if (index === -1) return count;
    count++;
    from = index + needle.length;
  }
}

/**
 * A cut point inside a single line: the first word boundary within the context budget that leaves
 * the line's inline markers balanced. Cutting between the two halves of a `**bold**` span (or a
 * `` ` `` pair) would leave a stray opener that swallows the rest of the paragraph, so candidates
 * that would do that are skipped rather than repaired afterwards.
 */
function findInlineCut(markdown: string, lineStart: number, matchIndex: number): number | null {
  const earliest = Math.max(lineStart, matchIndex - CONTEXT_CHARS);
  for (let i = earliest; i < matchIndex; i++) {
    if (markdown[i] !== " ") continue;
    const dropped = markdown.slice(lineStart, i);
    if (countOccurrences(dropped, "**") % 2 !== 0) continue;
    if (countOccurrences(dropped, "`") % 2 !== 0) continue;
    return i + 1;
  }
  return null;
}

/**
 * Raycast's Detail view has no scroll API at all — there is no "scroll to this position" call to
 * make. This reaches the same result from the other end: when the first match sits far enough
 * down to be off-screen, the markdown itself is trimmed to START just before it, so the match is
 * simply already in view.
 *
 * Cutting on line boundaries alone is not enough, which is the part that looked like it wasn't
 * working. Notes here store a paragraph as ONE long line (the wrapping is display-only), so a
 * match 500 characters into a paragraph is still on the first or second line — "trim to the line
 * before it" trims nothing and leaves the match exactly where it was. Hence the inline cut.
 */
function trimToMatch(markdown: string, matchIndex: number): string {
  if (matchIndex < VISIBLE_HEAD_CHARS) return markdown;

  const lineStarts = [0];
  for (let i = 0; i < markdown.length; i++) {
    if (markdown[i] === "\n") lineStarts.push(i + 1);
  }
  let lineIndex = 0;
  for (let i = lineStarts.length - 1; i >= 0; i--) {
    if (lineStarts[i] <= matchIndex) {
      lineIndex = i;
      break;
    }
  }

  // Whole preceding lines first, as far back as the context budget allows.
  let startLine = lineIndex;
  while (startLine > 0 && matchIndex - lineStarts[startLine - 1] <= CONTEXT_CHARS) startLine--;
  const lineStart = lineStarts[startLine];

  if (matchIndex - lineStart > CONTEXT_CHARS) {
    const lineEnd = markdown.indexOf("\n", lineStart);
    const line = markdown.slice(lineStart, lineEnd === -1 ? undefined : lineEnd);
    if (isPlainParagraphLine(line)) {
      const cut = findInlineCut(markdown, lineStart, matchIndex);
      if (cut !== null) return `⋯ ${markdown.slice(cut)}`;
    }
  }

  // Nothing was actually dropped, so don't claim otherwise with a truncation marker.
  if (lineStart === 0) return markdown;
  return `*⋯*\n\n${markdown.slice(lineStart)}`;
}

/** Where the first occurrence of any term starts in `markdown`, or -1. Terms arrive lowercased
 *  with quotes folded (parseSearchTerms), so the text is folded the same way to compare. */
function firstMatchIndex(markdown: string, terms: string[]): number {
  const haystack = straightenQuotes(markdown).toLowerCase();
  let first = -1;
  for (const term of terms) {
    const index = haystack.indexOf(term);
    if (index !== -1 && (first === -1 || index < first)) first = index;
  }
  return first;
}

/**
 * The detail pane's markdown for one note and the current query.
 *
 * The title is rendered as a heading above the body because a note's title lives in frontmatter,
 * not in its text — so the body alone starts mid-thought with nothing naming what you're looking
 * at. It's prepended AFTER the body is trimmed, so it stays at the top even when the body has
 * been cut to bring a match into view.
 */
export function buildPreview(markdown: string, query: string, title: string): string {
  const terms = parseSearchTerms(query);
  const at = terms.length > 0 ? firstMatchIndex(markdown, terms) : -1;
  const body = at === -1 ? markdown : trimToMatch(markdown, at);
  return `# ${title}\n\n${body}`;
}
