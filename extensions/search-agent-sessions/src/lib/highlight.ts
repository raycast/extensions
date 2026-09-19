import { DEFINITION, QUOTE, mapProse } from "./markdown";

/**
 * The treatment a matched word gets in the detail pane.
 *
 * Bold and underline together, which is as loud as the renderer goes. Raycast's
 * markdown draws no colour and no background: `<mark>`, `<span style>` and
 * `<font color>` are all swallowed tags, and `==mark==` renders as literal
 * equals signs. Of the HTML it does pass through, `<ins>` is what draws — `<u>`,
 * confusingly, does not — and its `style` attribute is ignored, so underline is
 * the whole of what it offers.
 *
 * Underline carries the highlight rather than bold alone because transcripts
 * write their own `**emphasis**` constantly, and a mark indistinguishable from
 * the author's own emphasis is not a mark.
 */
const OPEN = "<ins>**";
const CLOSE = "**</ins>";

/** A half-open `[start, end)` range of a string. */
type Range = [number, number];

/**
 * What a marking pass looks for: each query word on its own, or the whole
 * query as one phrase. {@link marksFor} decides which.
 */
export type Marks = string[] | RegExp;

/**
 * Whether a query word occurs in `text` at all.
 *
 * The detail pane holds the stretch of transcript it has already loaded for as
 * long as this is true of it, so refining a query re-marks the messages on
 * screen instead of jumping to whatever line the restarted sweep now likes best.
 *
 * Looser than the marks, on purpose and in one direction only: it says yes for
 * a word inside a code block, which {@link highlight} leaves unmarked; it stays
 * word-by-word where {@link marksFor} may have narrowed the marks to the whole
 * phrase; and it lowercases unconditionally where {@link ranges} cannot. The
 * guard there is about offsets — a mark has to land on the right characters —
 * and a boolean has none to get wrong. Erring the other way is what would
 * hurt: the pane would let go of a window the user can plainly see their query
 * in, which is the one thing this exists to prevent.
 *
 * `scoreLine` in `rank.ts` answers the same question, and is what decides
 * whether a session becomes a row at all. It is not reused because it goes on
 * to measure the tightest span covering every matched word: this runs over a
 * whole window of transcript to answer yes or no, and stops at the first hit.
 */
export function hasMatch(text: string, words: string[]): boolean {
  const haystack = text.toLowerCase();
  for (const word of words) if (word && haystack.includes(word)) return true;
  return false;
}

/** Regex specials escaped, so a query word only ever matches itself. */
const SPECIALS = /[.*+?^${}()|[\]\\]/g;

/**
 * What a phrase may span between two of its words: whitespace in any amount,
 * but never across a blank line.
 *
 * Whitespace is ignored because the indexer collapses it before the sweep
 * matches, so a line the user half-remembers counts however it was wrapped. A
 * blank line is where that stops. Two words either side of a paragraph break
 * are not a phrase any reader sees, and the heading demotion in `detail.ts`
 * manufactures such breaks routinely — a message opening `# what`
 * above a paragraph starting `the` would otherwise read as a hit and silence
 * every real mark on the pane.
 */
const GAP = String.raw`(?![^\S\n]*\n[^\S\n]*\n)\s+`;

/**
 * Regions of prose markdown consumes: no mark may be spliced into one, and no
 * reader sees one either. Both passes below turn on that single fact.
 *
 * A tag inside a URL breaks the link outright, so targets, bare URLs and
 * anything already tag-shaped are stepped over. A link's *text* is fair game:
 * the renderer draws the underline over the link colour.
 *
 * Images are skipped whole. Their alt text is never drawn, and their URL is a
 * file path the embed pass just resolved.
 *
 * A target on its own — the second alternative — is a whole link that never
 * arrived whole. {@link mapProse} cuts a line at every code span, and
 * transcripts write link text in backticks, so `` [`src/x.ts`](./notes.md) ``
 * reaches here as a fragment beginning at the `]`. Without this the target went
 * unprotected unless its scheme happened to match the URL alternative below,
 * and a mark spliced into a relative one killed the link.
 */
const PROTECTED =
  /(!?)\[([^\]\n]*)\]\([^)\n]*\)|\]\([^)\n]*\)|<[^\n>]*>|[a-z][a-z0-9+.-]*:\/\/[^\s)]+/gi;

/**
 * The rendered text of a {@link PROTECTED} match, or undefined where none of it
 * renders. Both passes decode a match this way, and reading the capture groups
 * twice is how they would come to disagree about what a link is.
 */
function shown(bang: string, label: string | undefined): string | undefined {
  return label !== undefined && !bang ? label : undefined;
}

/**
 * The part of a message a reader actually sees, which is where a phrase has to
 * be found for suppressing the word marks to be honest.
 *
 * Code counts, and is why this is not simply "wherever a mark could go": a
 * fence shows the query as plainly as a paragraph does, and {@link highlight}
 * cannot mark inside one. Running through {@link mapProse} is what keeps that
 * promise — it hands over prose alone, so a link or tag shape written *inside*
 * code stays as the reader sees it rather than being stripped as markup.
 *
 * What does not count is text markdown consumes: a {@link PROTECTED} region,
 * and a link reference definition, which renders as nothing at all and so is
 * dropped whole. A phrase found only in one of those suppressed every mark on
 * a pane that showed the user no phrase either — strictly worse than the word
 * noise this exists to avoid.
 *
 * The definition pass is the one place the code exemption does not reach: it
 * runs line by line ahead of {@link mapProse}, so a definition-shaped line
 * quoted inside a fence is dropped though the reader sees it. Teaching
 * `mapProse` to hand back the lines it declines to transform would close that,
 * at the cost of an API for one rare shape. It errs toward word marks, which
 * is the direction that only costs noise.
 *
 * A removed region leaves a blank line behind. Closing up would butt the two
 * halves of a sentence together into a phrase nobody wrote, and a space is no
 * better, {@link GAP} being free to cross one: an image between the query's
 * two words then read as a hit and silenced the pane it was supposed to mark.
 * A blank line is the one separator the phrase rule already refuses to span,
 * so the gap it leaves cannot be bridged. Nothing here is ever marked or
 * rendered — the text exists only to be searched — so the extra lines cost
 * nothing.
 */
function visible(text: string): string {
  const prose = text
    .split("\n")
    .filter((line) => !DEFINITION.test(line.replace(QUOTE, "")))
    .join("\n");
  return mapProse(prose, (part) =>
    part.replace(
      PROTECTED,
      (_, bang: string, label: string | undefined) =>
        shown(bang, label) ?? "\n\n",
    ),
  );
}

/**
 * What the pane should mark, decided once over everything it will show.
 *
 * The query is matched word by word, and a pane marked the same way strews
 * underlines over every stray `the` on screen — including the one inside
 * `then` — when the line the user retyped from memory is sitting there whole.
 * So the whole query is looked for first, as a phrase: its words in order,
 * separated by a {@link GAP}. If any of `texts` shows the phrase, the phrase
 * alone is marked; only when none does do the marks fall back to the words.
 * The decision is pane-wide on purpose — one message showing the phrase makes
 * word marks in its neighbours noise about the same hit.
 *
 * The phrase is a regex where the words are `indexOf` sweeps, because flexible
 * whitespace does not `indexOf`. It runs on the text as written, `iu` doing
 * the case folding, so the offset hazard {@link ranges} lowercases around
 * cannot arise.
 *
 * One consequence is accepted: a phrase the pane shows but cannot mark — one
 * inside code, or broken across a line — counts for the decision and draws
 * nothing. Such a pane shows the hit plainly, just unmarked, which is the
 * quieter of the two ways to be silent about it.
 */
export function marksFor(texts: string[], words: string[]): Marks {
  // An empty word would join into a bare `\s+`, marking every space on screen.
  // `parseQuery` drops empty tokens, so this guards the exported API rather
  // than the command; the word path below skips them one by one for the same
  // reason.
  if (words.length < 2 || words.some((word) => !word)) return words;
  const phrase = new RegExp(
    words.map((word) => word.replace(SPECIALS, String.raw`\$&`)).join(GAP),
    "giu",
  );
  return texts.some((text) => visible(text).search(phrase) !== -1)
    ? phrase
    : words;
}

/**
 * Where the marks land, merged into non-overlapping ranges, in order.
 *
 * Merging is not a tidy-up. Query words overlap constantly — a query of `link
 * links` matches twice over the same six characters — and wrapping each hit
 * separately nests one mark inside another, which renders as neither. Ranges
 * that merely touch are merged too: `<ins>**high**</ins><ins>**light**</ins>`
 * draws a seam through the middle of a word. A phrase cannot overlap itself,
 * but `a b` in `a ba b` touches, so its ranges take the same merge.
 */
function ranges(text: string, marks: Marks): Range[] {
  if (marks instanceof RegExp)
    return merge(
      Array.from(text.matchAll(marks), (m): Range => [
        m.index,
        m.index + m[0].length,
      ]),
    );

  // Lowercasing to match the way ripgrep swept the corpus (`-F -i`). A few
  // characters lengthen when lowercased — U+0130 becomes two code units — and
  // every offset after one would then point into the wrong place, so the
  // comparison falls back to case-sensitive rather than mark the wrong text.
  const lower = text.toLowerCase();
  const haystack = lower.length === text.length ? lower : text;

  const found: Range[] = [];
  for (const word of marks) {
    if (!word) continue;
    // `at + 1`, not `at + word.length`: occurrences of one word can overlap
    // each other (`aa` in `aaa`), and the merge below is what resolves them.
    for (
      let at = haystack.indexOf(word);
      at !== -1;
      at = haystack.indexOf(word, at + 1)
    )
      found.push([at, at + word.length]);
  }
  return merge(found);
}

function merge(found: Range[]): Range[] {
  if (found.length < 2) return found;
  found.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Range[] = [found[0]];
  for (const [start, end] of found.slice(1)) {
    const last = merged[merged.length - 1];
    if (start <= last[1]) last[1] = Math.max(last[1], end);
    else merged.push([start, end]);
  }
  return merged;
}

/**
 * `text` with every match marked, each slice passed through `map` on the way.
 *
 * `map` exists for the pane's fallback, which is flattened corpus text and has
 * to be escaped before it renders. Escaping first would be wrong — the
 * backslash it puts in front of a `_` splits a word the query matched — so the
 * matching runs on the raw text and the escaping runs on the pieces.
 */
export function markMatches(
  text: string,
  marks: Marks,
  map: (slice: string) => string = (slice) => slice,
): string {
  const found = ranges(text, marks);
  if (found.length === 0) return map(text);

  let out = "";
  let last = 0;
  for (const [start, end] of found) {
    out +=
      map(text.slice(last, start)) + OPEN + map(text.slice(start, end)) + CLOSE;
    last = end;
  }
  return out + map(text.slice(last));
}

/** One stretch of prose, marked outside anything {@link PROTECTED} covers. */
function markProse(part: string, marks: Marks): string {
  let out = "";
  let last = 0;
  for (const match of part.matchAll(PROTECTED)) {
    const [whole, bang, label] = match;
    out += markMatches(part.slice(last, match.index), marks);
    // A link, and not an image: mark between its brackets and leave the target.
    // `whole.slice` resumes at the `]`, so the target is copied as it stands.
    const text = shown(bang, label);
    out +=
      text !== undefined
        ? `[${markMatches(text, marks)}${whole.slice(1 + text.length)}`
        : whole;
    last = match.index + whole.length;
  }
  return out + markMatches(part.slice(last), marks);
}

/**
 * Marks what the query matched, everywhere the pane can show a mark.
 *
 * `marks` is the query's words, or the whole query as a phrase where
 * {@link marksFor} found it on screen.
 *
 * Code is left exactly as written, fenced and indented and inline alike: the
 * renderer prints `<ins>` literally inside code, so a mark there would show its
 * own tags in the middle of a line of source. That is the one real loss here —
 * a hit that only occurs inside a code block goes unmarked — and it is
 * unavoidable, since markdown gives no way to style a span of a code block.
 */
export function highlight(text: string, marks: Marks): string {
  if (Array.isArray(marks) && !marks.length) return text;
  return mapProse(text, (part) => markProse(part, marks));
}
