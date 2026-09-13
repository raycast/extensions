const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

export function relativeTime(ms: number, now = Date.now()): string {
  const delta = Math.max(0, now - ms);
  if (delta < MINUTE) return "now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)}m`;
  if (delta < DAY) return `${Math.floor(delta / HOUR)}h`;
  if (delta < WEEK) return `${Math.floor(delta / DAY)}d`;
  if (delta < 52 * WEEK) return `${Math.floor(delta / WEEK)}w`;
  // Capped at two digits so no stamp can outgrow the column `padTimeColumn`
  // pads to. A third digit is reachable from a corrupt mtime, not just from a
  // genuinely ancient file, and it would render wider than every other row.
  return `${Math.min(99, Math.floor(delta / (52 * WEEK)))}y`;
}

const ASCII_FROM = 0x20;

/**
 * Advance widths, in em, of U+0020 through U+007E in code point order, read
 * from /System/Library/Fonts/SFNS.ttf — the system font Raycast draws lists
 * in. Ratios are size-independent, so no font size has to be assumed here. To
 * regenerate: for each code point, map it through the font's `cmap` and divide
 * the `hmtx` advance of the glyph it lands on by `head.unitsPerEm` (2048).
 *
 * SFNS is a variable font and these are its default instance, so a face drawn
 * at another weight or optical size runs a percent or two off the table.
 */
const ASCII_EM: ReadonlyArray<number> = [
  0.2051, 0.2666, 0.4033, 0.6045, 0.6045, 0.8081, 0.6689, 0.2539, 0.3223,
  0.3223, 0.4004, 0.6045, 0.2148, 0.4287, 0.2148, 0.2793, 0.6064, 0.4434,
  0.5659, 0.5918, 0.6045, 0.585, 0.6172, 0.5469, 0.5996, 0.6172, 0.2148, 0.2148,
  0.6045, 0.6045, 0.6045, 0.4893, 0.8745, 0.6353, 0.6045, 0.686, 0.6787, 0.5522,
  0.5278, 0.7065, 0.6992, 0.2246, 0.4951, 0.6006, 0.5244, 0.8311, 0.6992,
  0.7314, 0.5776, 0.7314, 0.5991, 0.5933, 0.5811, 0.6963, 0.6309, 0.9238,
  0.6348, 0.6123, 0.6167, 0.3223, 0.2793, 0.3223, 0.6045, 0.5269, 0.5, 0.502,
  0.5537, 0.501, 0.5537, 0.5122, 0.3037, 0.5488, 0.5391, 0.2061, 0.2051, 0.4854,
  0.2041, 0.8032, 0.5269, 0.5308, 0.5493, 0.5488, 0.3081, 0.4653, 0.3013,
  0.5269, 0.4829, 0.7153, 0.4683, 0.4863, 0.4678, 0.3223, 0.2158, 0.3223,
  0.6045,
];

/** The finest pad the font carries, so the floor on how exact the column gets. */
const HAIR = { char: "\u200A", em: 0.0513 } as const;

/**
 * Unicode spaces the system font carries, widest first. Plain U+0020 is left
 * out deliberately: it is the one pad a text renderer might strip as leading
 * whitespace, and the hair space already sets the residual, so it buys nothing.
 */
const PAD_EM: ReadonlyArray<{ char: string; em: number }> = [
  { char: "\u2007", em: 0.6045 }, // figure
  { char: "\u2002", em: 0.5 }, // en
  { char: "\u2004", em: 0.333 }, // three-per-em
  { char: "\u2005", em: 0.25 }, // four-per-em
  { char: "\u2006", em: 0.166 }, // six-per-em
  { char: "\u2009", em: 0.1025 }, // thin
  HAIR,
];

/** The mark this module cuts with, measured off SFNS the same way. */
const ELLIPSIS = { char: "…", em: 0.5918 } as const;

/** What the detail header sets between its fields, measured the same way. */
const MIDDLE_DOT = { char: "·", em: 0.2148 } as const;

/**
 * Every width in one lookup; PAD_EM is left owning nothing but order. The mark
 * is in here too, so `emWidth` can measure what `fitWidth` hands back, and the
 * dot so it can measure a header, whose every stamp carries one.
 */
const EM = new Map<string, number>([
  ...ASCII_EM.map(
    (em, i) => [String.fromCharCode(ASCII_FROM + i), em] as [string, number],
  ),
  ...PAD_EM.map(({ char, em }) => [char, em] as [string, number]),
  [ELLIPSIS.char, ELLIPSIS.em],
  [MIDDLE_DOT.char, MIDDLE_DOT.em],
]);

/** Rounding to the nearest hair leaves at most half of one unaccounted for. */
export const COLUMN_TOLERANCE_EM = HAIR.em / 2;

/** Upper bound on any stamp: two of the widest digits, then the widest unit. */
export const COLUMN_EM = emWidth("66m");

/** Width of `text` in em, or NaN if it uses a glyph that was never measured. */
export function emWidth(text: string): number {
  let width = 0;
  for (const ch of text) {
    const em = EM.get(ch);
    if (em === undefined) return NaN;
    width += em;
  }
  return width;
}

/**
 * Leading-pad a relative timestamp to a constant rendered width.
 *
 * Raycast lays list accessories out right-aligned and sized to their content,
 * with no column model, so the only thing holding the project column's right
 * edge still is the timestamp beside it always drawing the same width. Padding
 * by character count is not enough: the list font has proportional digits, so
 * "1" is a third narrower than "6". Raycast's own `date` accessory renders
 * relative times natively, but it takes a Date and is content-sized too, so it
 * removes the string this needs to pad without fixing the width.
 *
 * @param text output of `relativeTime`. Anything the table cannot measure, or
 * that already draws wider than the column, comes back untouched.
 */
/**
 * Memo for the two formatters below, both of which are called from a row's
 * render body — 300 rows re-rendering up to twenty times a second while results
 * stream, each call walking the string through `Intl.Segmenter` and normalizing
 * every grapheme. Both are pure with a tiny key space: `relativeTime` emits on
 * the order of a hundred distinct stamps, and a screenful of rows shares a few
 * dozen project names, so the table stays small without needing eviction.
 */
const memoize = (f: (s: string) => string) => {
  const seen = new Map<string, string>();
  return (text: string) => {
    const hit = seen.get(text);
    if (hit !== undefined) return hit;
    const value = f(text);
    seen.set(text, value);
    return value;
  };
};

export const padTimeColumn = memoize(padTime);

function padTime(text: string): string {
  let gap = COLUMN_EM - emWidth(text);
  if (Number.isNaN(gap)) return text;

  let pad = "";
  for (const { char, em } of PAD_EM) {
    while (gap >= em) {
      pad += char;
      gap -= em;
    }
  }
  if (gap >= COLUMN_TOLERANCE_EM) pad += HAIR.char;
  return pad + text;
}

/**
 * Width a project name may draw beside a padded stamp before the row runs out.
 *
 * Raycast sizes the accessory group to its content and hands the title
 * whatever is left, but only down to a floor. Past that the group keeps its
 * width and the list clips it, which takes the timestamp — the last accessory,
 * and the one `padTimeColumn` went to the trouble of aligning — with it.
 *
 * Nothing in the API reports how wide a row is, so this is bracketed off a
 * rendered list rather than derived: with the pane open, at the default window
 * and text size, `dotfiles` (3.08em) left the stamp whole and `unsettled`
 * (3.90em) cut it, by around a third of an em. Rounded down inside that
 * bracket, because being wrong should cost a name one character rather than
 * cost every stamp a glyph. A compact window and a third accessory both move
 * that edge unseen; `environment.textSize` does report the third input, but
 * what "large" does to the row was never measured, and a guessed second budget
 * beside a bracketed one would make both look equally sound.
 */
export const PROJECT_EM = 3.5;

/**
 * Grapheme clusters, so no cut can land inside one drawn glyph. The locale is
 * left off because cluster boundaries do not depend on one.
 */
const GRAPHEMES = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** A mark or a joiner rides on the glyph beside it and adds no advance. */
const RIDES_ALONG = /^[\p{M}\p{Cf}]$/u;

/**
 * Width of one cluster in em. A cluster built on a glyph nothing measured —
 * an ideograph, an emoji, a joiner sequence — draws as a single glyph, and one
 * em is close to what that glyph actually takes. A few faces run wider (`★`
 * and `№` by two percent), so a name written in those can overrun by a
 * fraction of a glyph.
 *
 * Decomposing first is what makes the two forms of an accented letter cost the
 * same: macOS hands back either one, and only the decomposed form has a letter
 * the table measures underneath the mark.
 */
function clusterEm(cluster: string): number {
  let width = 0;
  for (const ch of cluster.normalize("NFD")) {
    const em = EM.get(ch);
    if (em === undefined) {
      if (RIDES_ALONG.test(ch)) continue;
      return 1;
    }
    width += em;
  }
  return width;
}

/**
 * Cut `text` to at most `budget` em, marking the cut with an ellipsis.
 *
 * Unlike `emWidth`, an unmeasured cluster does not void the result: giving up
 * would return the string whole, which is the one outcome the budget exists to
 * prevent.
 *
 * @param budget em to fit within. A budget that is not a finite number cannot
 * be met, and cutting to it would return more than it was handed, so the text
 * comes back whole — which is also what an infinite budget should yield.
 */
/**
 * Memoized on the text alone, which is sound only because the one caller passes
 * a constant budget; a second caller with a different budget would need the
 * budget in the key.
 */
export const fitWidth = (text: string, budget: number): string =>
  budget === PROJECT_EM ? fitProject(text) : fit(text, budget);

const fitProject = memoize((text: string) => fit(text, PROJECT_EM));

function fit(text: string, budget: number): string {
  if (!Number.isFinite(budget)) return text;

  // The mark is part of what has to fit, so it comes out of the budget before
  // anything is kept. That puts `room` below `budget`, which settles where to
  // cut before the running width can reach the budget — so one pass does both,
  // and a name far over stops there instead of being segmented to the end. A
  // budget too small for the mark alone keeps nothing and yields it by itself.
  const room = budget - ELLIPSIS.em;
  let width = 0;
  let cut = 0;
  for (const { segment, index } of GRAPHEMES.segment(text)) {
    const em = clusterEm(segment);
    if (width + em <= room) cut = index + segment.length;
    width += em;
    if (width > budget) return text.slice(0, cut) + ELLIPSIS.char;
  }
  return text;
}

/**
 * Advance of every glyph in the system monospace face, in em, read from
 * SFNSMono.ttf the way `ASCII_EM` was read from SFNS. One number covers the
 * face: monospace means every glyph is drawn to the same advance.
 */
const MONO_EM = 0.6182;

/**
 * Characters of the monospace face the detail pane's header line holds.
 *
 * Counted rather than measured in em: a code span is set in that face, where
 * every glyph draws `MONO_EM`, so characters are what a path costs. A glyph
 * that face draws to the em square, CJK among them, takes half again as much
 * and runs wider than this counts.
 *
 * Bracketed off a rendered pane, as `PROJECT_EM` was: a 63-character path
 * wrapped, its second line beginning at the 59th character, so the line holds
 * at least 58 and fewer than 63. The floor of that bracket is taken, one
 * elided character being cheaper than a wrap. Raycast breaks the span at
 * hyphens and separators rather than at the last character that fits, so the
 * observed break is a lower bound on the width and not the width itself. A
 * compact window or a larger text size moves the edge unseen, as they do
 * `PROJECT_EM`'s.
 */
export const HEADER_CHARS = 58;

/**
 * What the header's stamp is charged over what `ASCII_EM` measures of it.
 *
 * This is the module's one absolute use of that table. Everywhere else a table
 * width is compared against another — a stamp against `COLUMN_EM`, a name
 * against `PROJECT_EM` — and a table read at the wrong size cancels itself out.
 * Here a proportional width is divided by an advance from a second font file,
 * so how wide the table runs against the face actually drawn is what decides
 * whether the line holds.
 *
 * Two things make the drawn stamp the wider one, both by a proportion of it
 * rather than by a fixed amount, which is why this is a factor and not a
 * subtracted margin. `ASCII_EM` is SFNS's default instance, and the header is
 * set bold at whatever optical size the pane draws text at; and the code face
 * may be set smaller than the text beside it, which costs the stamp characters
 * in inverse proportion — `HEADER_CHARS` counts glyphs of the code face and so
 * already carries its size, while the stamp does not scale with it.
 *
 * Neither is reported by Raycast, so a third is charged: about a tenth for the
 * weight, and the rest for a code face down to roughly four fifths of the text
 * around it.
 */
const STAMP_OVERCHARGE = 1.3;

/**
 * Characters the header's path may draw when `rest` shares the line with it.
 */
export function headerPathChars(rest: string): number {
  return Math.max(
    0,
    Math.floor(HEADER_CHARS - (stampEm(rest) * STAMP_OVERCHARGE) / MONO_EM),
  );
}

/**
 * Width of text beside the header's path, in em.
 *
 * The table prices every stamp `Intl` writes in a Latin locale, down to the
 * dot between the fields, and reading it is a hundredfold cheaper than walking
 * clusters — which matters, the pane assembling a header for every row it
 * holds. The walk is what prices the stamps it misses, charging an unmeasured
 * glyph a full em rather than voiding the result as `emWidth` does: a stamp
 * this cannot price is a locale's, not a corruption, and over-charging it costs
 * the path a character where giving up would wrap the line.
 */
function stampEm(text: string): number {
  const measured = emWidth(text);
  if (!Number.isNaN(measured)) return measured;

  let em = 0;
  for (const { segment } of GRAPHEMES.segment(text)) em += clusterEm(segment);
  return em;
}

/**
 * Either platform's directory separator, used only to find which one a path is
 * written with. Windows paths reach the header spelled with backslashes, and
 * splitting one on "/" alone yields a single segment: the elision below then
 * never runs and the whole path is cut from the left, losing exactly the project
 * name the elision exists to protect.
 */
const SEPARATOR = /[/\\]/;

/**
 * Shorten `path` to at most `budget` characters by eliding whole directories
 * out of its middle.
 *
 * A path is cut in the middle because both ends carry meaning the other cannot:
 * the head names the project, the last segment is what distinguishes one
 * worktree or checkout from its siblings. Interior directories are dropped
 * nearest the tail first, so the elision eats the boilerplate a deep path ends
 * in — `.claude/worktrees` and the like — before it touches the project.
 *
 * The last segment can outrun the budget on its own, leaving no elision that
 * fits. The whole path is then cut from its left, for the same reason the
 * middle goes first: what a path ends in is what tells two of them apart. That
 * is also the branch a name with no directory in it takes, there being no
 * middle to elide.
 *
 * @param budget characters. One that is not a finite number cannot be met, and
 * cutting to it would return more than it was handed, as in `fitWidth`.
 */
export function fitPath(path: string, budget: number): string {
  // The one separator this path is spelled with, read off its first rather than
  // guessed at, so that only it is ever treated as a boundary: a Windows path
  // has to be split and rejoined on backslashes, while on macOS a backslash is
  // an ordinary character in a name and splitting one would invent a directory
  // that is not there. A path with none is a single segment, which the loop
  // below leaves alone. Decided here rather than taken from `paths.ts`, which
  // probes the filesystem as it loads while this module stays pure.
  const first = path.search(SEPARATOR);
  const sep = first === -1 ? "/" : path[first];

  // A trailing separator would leave the empty string after it as the tail, and
  // the segment that names the session would be elided as an interior
  // directory. A cwd is copied out of a transcript verbatim, so it may carry
  // one, and `projects.ts` strips it for the same reason. A path of nothing but
  // separators keeps what it has.
  let end = path.length;
  while (end > 0 && path[end - 1] === sep) end--;
  const trimmed = path.slice(0, end) || path;
  if (!Number.isFinite(budget) || trimmed.length <= budget) return trimmed;

  const segments = trimmed.split(sep);
  const tail = segments.pop() ?? "";
  // Down to one head segment, which for an absolute path is the empty string
  // before the leading separator. Eliding that one too would save a single
  // character and cost the path its root.
  while (segments.length > 0) {
    const candidate = [...segments, ELLIPSIS.char, tail].join(sep);
    if (candidate.length <= budget) return candidate;
    segments.pop();
  }

  // The mark is part of what has to fit, as it is in `fitWidth`; a budget too
  // small for it alone keeps nothing else.
  const room = Math.max(0, budget - ELLIPSIS.char.length);
  return (
    ELLIPSIS.char + trimmed.slice(clusterStart(trimmed, trimmed.length - room))
  );
}

/**
 * The first grapheme boundary at or after `at`, so a cut there splits no drawn
 * glyph: slicing by code unit halves a surrogate pair, and strands the
 * combining mark of a decomposed accent on whatever ends up in front of it.
 */
function clusterStart(text: string, at: number): number {
  for (const { index } of GRAPHEMES.segment(text))
    if (index >= at) return index;
  return text.length;
}

/**
 * Context kept ahead of the match, in characters.
 *
 * Raycast truncates a subtitle to the width it is given rather than to the
 * string, and with the pane closed that width draws about forty characters of
 * ordinary prose. So the lead is the whole budget: every character in front of
 * the match is one the match may not get. Ten keeps the matched word inside the
 * first quarter of what draws.
 */
const SNIPPET_LEAD = 10;

/**
 * Trailing context, deliberately well past what draws. The width is not
 * knowable here, an over-long subtitle costs only a truncation Raycast performs
 * anyway, and a short one leaves the row half empty.
 */
const SNIPPET_LENGTH = 220;

/**
 * A window of the matching line, opening on a whole word just ahead of the
 * first match. Only a cut tail is marked.
 */
export function snippet(text: string, words: string[]): string {
  let first = -1;
  if (words.length) {
    const lower = text.toLowerCase();
    for (const word of words) {
      const at = lower.indexOf(word);
      if (at !== -1 && (first === -1 || at < first)) first = at;
    }
  }
  const start =
    first > SNIPPET_LEAD ? wordStart(text, first - SNIPPET_LEAD, first) : 0;
  const end = Math.min(text.length, start + SNIPPET_LENGTH);
  const head = start > 0;
  const tail = end < text.length;
  // No mark on the front. It would say only what the row already says, that the
  // subtitle is an excerpt, and cost a character's width the match could have
  // used. Opening on a whole word (see `wordStart`) is what makes the cut read
  // as deliberate rather than as a typo.
  //
  // Whitespace at a cut end goes with it. A leading run reads as a column that
  // failed to fill, and a trailing one leaves a gap before the mark. Only the
  // cut ends are trimmed, so a line short enough to be shown whole keeps the
  // indentation it came with.
  let body = text.slice(start, end);
  if (head) body = body.trimStart();
  if (tail) body = body.trimEnd();
  return tail ? body + ELLIPSIS.char : body;
}

/**
 * `at` when it already opens a word, else the next word after it.
 *
 * The lead is measured off the match, so it lands wherever it lands, mid-word
 * about as often as not. With nothing marking the cut, a subtitle opening on
 * "hat does appear" reads as a typo.
 *
 * Forward rather than back, because the lead is the one thing competing with
 * the match for the width: the characters given up here are the affordable
 * ones.
 *
 * @param limit the match's own offset. A lead holding no space at all is one
 * long token, a path or an identifier, and skipping to `limit` would drop the
 * context that explains the match. Such a lead is kept whole, mid-token cut and
 * all.
 */
function wordStart(text: string, at: number, limit: number): number {
  let i = at;
  // Past the partial word, if that is what `at` sits in, and then past the
  // break itself. The break is skipped here rather than trimmed later so the
  // check below compares against where the next word actually starts.
  if (!SPACE.test(text[i - 1])) while (i < limit && !SPACE.test(text[i])) i++;
  while (i < limit && SPACE.test(text[i])) i++;
  return i === limit ? at : i;
}

/** Single-character test, so the line's own tabs count as breaks too. */
const SPACE = /\s/;
