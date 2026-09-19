// Search, ranking, and preview-highlight logic, ported from main/handlers/vault.ts so results
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
 *  index found in a folded string is still valid against the original, which is what lets the
 *  highlight ranges below be applied to untouched display text. Ported verbatim. */
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

/* ── Preview highlighting ──────────────────────────────────────────────────────────────────── */

interface Range {
  start: number;
  end: number;
}

/**
 * Spans of raw markdown that must not be highlighted, because inserting the highlight's own
 * delimiters there would break the construct rather than mark anything:
 *
 *  - a link's `(target)`, where a stray backtick turns `![](https://…/photo-1.png)` into a dead
 *    link. Only the target half is protected; a match in the visible label is exactly what
 *    someone wants to see marked.
 *  - a code span, which cannot nest inside another code span.
 *  - the delimiters of an emphasis run — but NOT its contents. A code span nests inside emphasis
 *    perfectly well, so a match inside text the note already bolded still gets highlighted; only
 *    a match straddling the `**` itself has to be skipped, since that would split the run.
 */
// Unterminated fence included (`|$`): while a note is being written the last fence is often still
// open, and its contents are code all the same.
const FENCED_CODE = /```[\s\S]*?(?:```|$)/g;

/*
 * All inline constructs in ONE regex, so a single left-to-right pass consumes each whole
 * construct and the next alternative cannot borrow its delimiters. Scanning them separately is
 * subtly wrong: run on its own, `\*[^*\n]+\*` pairs the trailing asterisk of `**Commodo**` with
 * the leading asterisk of a later `**officia**` and protects the 285 characters between them,
 * silently suppressing every highlight in that stretch.
 *
 * Order is what makes the pass correct — code before emphasis (asterisks inside code are not
 * emphasis), and `**` before `*` so a strong span is never read as an em span plus strays.
 *
 * Emphasis is confined to one line because it cannot span a blank line; matching across newlines
 * let one unpaired `**` pair with a distant one and swallow whole paragraphs.
 */
const INLINE_CONSTRUCTS = /`[^`\n]*`|!?\[[^\]]*\]\([^)]*\)|\*\*[^\n]*?\*\*|~~[^\n]*?~~|\*[^*\n]+\*/g;

function protectedSpans(markdown: string): Range[] {
  const spans: Range[] = [];
  for (const match of markdown.matchAll(FENCED_CODE)) {
    spans.push({ start: match.index, end: match.index + match[0].length });
  }
  for (const match of markdown.matchAll(INLINE_CONSTRUCTS)) {
    const text = match[0];
    const at = match.index;
    if (/^!?\[/.test(text)) {
      spans.push({ start: at + text.lastIndexOf("](") + 1, end: at + text.length });
    } else if (text.startsWith("`")) {
      spans.push({ start: at, end: at + text.length });
    } else {
      const delimiter = text.startsWith("**") || text.startsWith("~~") ? 2 : 1;
      spans.push({ start: at, end: at + delimiter });
      spans.push({ start: at + text.length - delimiter, end: at + text.length });
    }
  }
  spans.sort((a, b) => a.start - b.start);
  return spans;
}

/** Every occurrence of every term outside `blocked`, merged where they overlap so a highlight is
 *  never drawn twice over the same characters (searching `not note` against "Notes" is one range,
 *  not two). Pass an empty `blocked` to find matches regardless of where they sit. */
function findTermRanges(markdown: string, terms: string[], blocked: Range[]): Range[] {
  const haystack = straightenQuotes(markdown).toLowerCase();
  const found: Range[] = [];

  for (const term of terms) {
    let from = 0;
    for (;;) {
      const start = haystack.indexOf(term, from);
      if (start === -1) break;
      const end = start + term.length;
      if (!blocked.some((span) => start < span.end && end > span.start)) found.push({ start, end });
      from = end;
    }
  }

  found.sort((a, b) => a.start - b.start);
  const merged: Range[] = [];
  for (const range of found) {
    const last = merged[merged.length - 1];
    if (last && range.start <= last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  return merged;
}

/**
 * Marks each range as an inline code span, which Raycast renders with a real background tint —
 * the nearest thing to a `<mark>` the Detail view offers. An actual `<mark>` is not an option:
 * Detail renders CommonMark and silently strips HTML tags, so it would highlight nothing (the
 * app's own notes contain `<mark>` already, and it comes through as plain text).
 *
 * The tint alone is the highlight — no `**` on top of it. Bolding as well reads as redundant
 * where the background already marks the text, and inside a run the note had already bolded it
 * produces `****`like this`****`.
 *
 * Applied back-to-front so each insertion can't shift the indices of the ranges still to come.
 */
function applyHighlights(markdown: string, ranges: Range[]): string {
  let result = markdown;
  for (let i = ranges.length - 1; i >= 0; i--) {
    const { start, end } = ranges[i];
    const text = result.slice(start, end);
    // A backtick inside the match would close the span early and garble the rest of the line.
    // Leaving that one unmarked is a better outcome than a broken render.
    if (text.includes("`")) continue;
    result = `${result.slice(0, start)}\`${text}\`${result.slice(end)}`;
  }
  return result;
}

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

/**
 * Trims so the first match is in view, then emphasises every match.
 *
 * Trimming happens before highlighting, and the ranges are then found a second time against the
 * trimmed text rather than having their indices adjusted. Recomputing is cheap (one note, a few
 * kilobytes) and removes the whole class of off-by-N bugs that index arithmetic across two
 * transformations invites.
 */
function highlightAndTrim(markdown: string, terms: string[]): string {
  if (terms.length === 0) return markdown;

  // Anchor the trim on a match that can actually be marked, so the pane lands somewhere the eye
  // has something to find. Falling back to any match at all matters for the common case of a term
  // the note itself already bolded: nothing there is highlightable, but it's still where the
  // reader wants to be taken.
  const highlightable = findTermRanges(markdown, terms, protectedSpans(markdown));
  const anchor = highlightable.length > 0 ? highlightable : findTermRanges(markdown, terms, []);
  if (anchor.length === 0) return markdown;

  const trimmed = trimToMatch(markdown, anchor[0].start);
  return applyHighlights(trimmed, findTermRanges(trimmed, terms, protectedSpans(trimmed)));
}

/**
 * The detail pane's markdown for one note and the current query.
 *
 * The title is rendered as a heading above the body because a note's title lives in frontmatter,
 * not in its text — so the body alone starts mid-thought with nothing naming what you're looking
 * at. It's prepended AFTER the body is trimmed, so it stays at the top even when the body has
 * been cut to bring a match into view, and it's highlighted separately so a query matching the
 * title shows there too.
 */
export function buildPreview(markdown: string, query: string, title: string): string {
  const terms = parseSearchTerms(query);
  const heading = highlightAndTrim(`# ${title}`, terms);
  return `${heading}\n\n${highlightAndTrim(markdown, terms)}`;
}
