// Text the way keyword search keeps and matches it (DigUp: SearchText.swift), plus the grapheme and whitespace
// helpers that the other text modules share. Swift counts `Character`s (grapheme clusters) where JavaScript counts
// UTF-16 units, and Foundation's whitespace sets differ from JavaScript's `\s` and `trim()`: both live here.

// ---------------------------------------------------------------------------------------------------------------
// Character classes (Foundation and ICU, verified against Apple's sets on macOS 26)
// ---------------------------------------------------------------------------------------------------------------

/** `Character.isWhitespace` and ICU's `\s`: the White_Space property (U+0085 yes, U+FEFF no). */
export function isWhiteSpace(codePoint: number): boolean {
  return (
    (codePoint >= 9 && codePoint <= 13) ||
    codePoint === 0x20 ||
    codePoint === 0x85 ||
    codePoint === 0xa0 ||
    codePoint === 0x1680 ||
    (codePoint >= 0x2000 && codePoint <= 0x200a) ||
    codePoint === 0x2028 ||
    codePoint === 0x2029 ||
    codePoint === 0x202f ||
    codePoint === 0x205f ||
    codePoint === 0x3000
  );
}

/** `CharacterSet.whitespaces`: spaces and tab, and (Apple's addition) the zero-width space. */
function isSpaceOrTab(unit: number): boolean {
  return (
    unit === 0x20 ||
    unit === 9 ||
    unit === 0xa0 ||
    unit === 0x1680 ||
    (unit >= 0x2000 && unit <= 0x200b) ||
    unit === 0x202f ||
    unit === 0x205f ||
    unit === 0x3000
  );
}

/** `CharacterSet.whitespacesAndNewlines`. */
function isSpaceOrNewline(unit: number): boolean {
  return isSpaceOrTab(unit) || (unit >= 10 && unit <= 13) || unit === 0x85 || unit === 0x2028 || unit === 0x2029;
}

function trimBy(text: string, inSet: (unit: number) => boolean): string {
  let start = 0;
  let end = text.length;
  while (start < end && inSet(text.charCodeAt(start))) start++;
  while (end > start && inSet(text.charCodeAt(end - 1))) end--;
  return start === 0 && end === text.length ? text : text.slice(start, end);
}

/** `trimmingCharacters(in: .whitespacesAndNewlines)`. */
export function trimWhitespaceAndNewlines(text: string): string {
  return trimBy(text, isSpaceOrNewline);
}

/** `trimmingCharacters(in: .whitespaces)`. */
export function trimWhitespace(text: string): string {
  return trimBy(text, isSpaceOrTab);
}

/** ICU's `\s+` as a regex source (White_Space). Use it with the `u` flag. */
export const WHITE_SPACE = String.raw`\p{White_Space}`;

// Swift's `Character.isLetter` is Alphabetic (marks and Indic signs too), plus 35 private-use code points Apple's data
// calls letters; `isNumber` is any Numeric_Type, so Han numerals (一 二 十 千 万 京 ...) count, which \p{N} misses.
// Both measured against Swift 6.3.1 on every scalar.
const LETTER = /[\p{Alphabetic}---]/u;
const NUMBER = new RegExp(
  String.raw`[\p{N}㐅㒃㠪㭍一七万三两九二五亖京亿什` +
    String.raw`仟仨伍佰俩倆億兆兩八六十千-卅卌叁-叄` +
    String.raw`四壱壹幺廾廿弌-弎弐拐拾捌柒洞漆玖百` +
    String.raw`皕秭肆萬貮貳贰鈎钩阡陆陌陸零參拾兩` +
    String.raw`零六陸什\u{12038}\u{12039}\u{12079}\u{12226}\u{1222b}\u{1230b}\u{1230d}\u{12399}` +
    String.raw`\u{20001}\u{20064}\u{200e2}\u{20121}\u{2092a}\u{20983}\u{2098c}\u{2099c}\u{20aea}\u{20afd}\u{20b19}` +
    String.raw`\u{22390}\u{22998}\u{23b1b}\u{2626d}\u{2f890}]`,
  "u",
);
const ALPHANUMERIC = /[\p{L}\p{M}\p{N}]/u;
const LETTER_OR_MARK = /[\p{L}\p{M}]/u;
const NON_ASCII = /[\u0080-\uffff]/;

/** Swift's `String.lowercased()`: scalar by scalar, so Σ never becomes ς (JavaScript's `toLowerCase` looks at context). */
export function lowercased(text: string): string {
  if (!NON_ASCII.test(text)) return text.toLowerCase();
  let out = "";
  for (const scalar of text) out += scalar.toLowerCase();
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// Graphemes
// ---------------------------------------------------------------------------------------------------------------

/** Anything that can join with the character before or after it into one grapheme cluster (marks, joiners, Hangul
 *  jamo, prepended signs, astral planes). Between two characters that are neither, a new one always starts, except
 *  inside CR LF. */
const JOINS_SOURCE =
  String.raw`[\p{M}\u0600-\u0605\u06dd\u070f\u0890\u0891\u08e2\u0d4e\u0e33\u0eb3\u1100-\u11ff\ua960-\ua97f` +
  String.raw`\ud7b0-\ud7ff\uff9e\uff9f\ud800-\udfff\u{10000}-\u{10ffff}]|\u200c|\u200d`;
const JOINS = new RegExp(JOINS_SOURCE, "u");

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

/** Signs that stack the next consonant under the one before (Khmer coeng, Myanmar U+1039, Javanese pangkon and more).
 *  ICU keeps the stack one Character; Swift starts a new one at the stacked consonant (every mark checked against
 *  Swift 6.3). */
const STACKER =
  /[\u1039\u17d2\u1a60\u1b44\u1bab\ua9c0\uaaf6\u{10a3f}\u{11133}\u{113d0}\u{1193e}\u{11a47}\u{11a99}\u{11f42}]/u;
// What may follow the sign in its Character (marks, joiners), then a letter that starts a new one (not Thai or Lao
// "am" or a halfwidth voicing mark, which join whatever comes before them).
const STACKED = new RegExp(
  String.raw`${STACKER.source}[\p{M}\u200c\u200d]*(?=(?![\u0e33\u0eb3\uff9e\uff9f])\p{L})`,
  "gu",
);

const CR = 13;
const LF = 10;

/** A UTF-16 unit that never joins anything: not a surrogate, not in `JOINS`. */
function isPlainUnit(text: string, at: number): boolean {
  const unit = text.charCodeAt(at);
  return !(unit >= 0xd800 && unit <= 0xdfff) && !JOINS.test(text[at]);
}

/** Whether a Character always starts at `at`, whatever comes before and after. */
function isCut(text: string, at: number): boolean {
  if (at <= 0 || at >= text.length) return true;
  const crlf = text.charCodeAt(at - 1) === CR && text.charCodeAt(at) === LF;
  return !crlf && isPlainUnit(text, at - 1) && isPlainUnit(text, at);
}

/**
 * `text` in stretches that start and end where a Character always starts. In a `plain` one each UTF-16 unit starts a
 * Character, except the LF of a CR LF; the others go to ICU, from a character before their first joining one to one after
 * their last. So a text with an emoji in it costs a regex scan and a few segmenter calls, not a segmenter pass.
 */
function* stretches(text: string): Generator<[from: number, to: number, plain: boolean]> {
  const joins = new RegExp(JOINS_SOURCE, "gu");
  let from = 0;
  let hit = joins.exec(text);
  while (hit) {
    let start = Math.max(from, hit.index - 1);
    if (!isCut(text, start)) start--; // inside CR LF
    let end = hit.index + hit[0].length;
    for (;;) {
      while (!isCut(text, end)) end++;
      joins.lastIndex = end;
      hit = joins.exec(text);
      // Joining characters close together share a window: fewer segmenter calls, but none too long to hold.
      if (!hit || hit.index - end > 32 || end - start > 4096) break;
      end = hit.index + hit[0].length;
    }
    if (start > from) yield [from, start, true];
    yield [start, end, false];
    from = end;
  }
  if (from < text.length) yield [from, text.length, true];
}

/** Where Characters start in a stretch that is not plain, as Swift splits them. */
function windowStarts(text: string, from: number, to: number): number[] {
  const starts: number[] = [];
  for (const { segment, index } of segmenter.segment(text.slice(from, to))) {
    starts.push(from + index);
    if (!STACKER.test(segment)) continue;
    for (const stack of segment.matchAll(STACKED)) starts.push(from + index + stack.index + stack[0].length);
  }
  return starts;
}

/** A unit that starts a Character in a plain stretch: anything but the LF of a CR LF. */
const startsPlain = (text: string, at: number) => text.charCodeAt(at) !== LF || text.charCodeAt(at - 1) !== CR;

/** A string seen as Swift sees it: an array of `Character`s. Boundaries are computed once; a text without joining
 *  characters (most of them) costs one regex test. */
export class Graphemes {
  readonly count: number;
  private readonly starts: Uint32Array | null;

  constructor(readonly text: string) {
    if (!JOINS.test(text) && !text.includes("\r\n")) {
      this.starts = null;
      this.count = text.length;
      return;
    }
    const starts = new Uint32Array(text.length + 1);
    let count = 0;
    for (const [from, to, plain] of stretches(text)) {
      if (plain) {
        for (let at = from; at < to; at++) if (startsPlain(text, at)) starts[count++] = at;
      } else {
        for (const start of windowStarts(text, from, to)) starts[count++] = start;
      }
    }
    starts[count] = text.length;
    this.starts = starts.subarray(0, count + 1);
    this.count = count;
  }

  /** UTF-16 offset where grapheme `index` starts (`count` gives the text's length). */
  start(index: number): number {
    return this.starts ? this.starts[index] : index;
  }

  /** The index of the grapheme that holds UTF-16 offset `offset` (`count` at the end of the text). */
  indexAt(offset: number): number {
    if (!this.starts) return offset;
    let low = 0;
    let high = this.count;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.starts[middle] <= offset) low = middle;
      else high = middle - 1;
    }
    return low;
  }

  /** Whether a UTF-16 offset is between two graphemes (or at either end). */
  isBoundary(offset: number): boolean {
    return this.start(this.indexAt(offset)) === offset;
  }

  slice(from: number, to: number): string {
    return this.text.slice(this.start(from), this.start(to));
  }

  at(index: number): string {
    return this.slice(index, index + 1);
  }

  /** `Character.isWhitespace`: the first scalar decides. */
  isWhitespace(index: number): boolean {
    return isWhiteSpace(this.text.codePointAt(this.start(index)) ?? 0);
  }
}

/** `text.count`. */
export function graphemeCount(text: string): number {
  let count = 0;
  for (const [from, to, plain] of stretches(text)) {
    if (!plain) {
      count += windowStarts(text, from, to).length;
      continue;
    }
    count += to - from;
    for (let at = text.indexOf("\r\n", from); at >= 0 && at < to; at = text.indexOf("\r\n", at + 2)) count--;
  }
  return count;
}

/** `String(text.prefix(count))`. Splits only the start of the text: Characters before the cut don't change with what
 *  follows it, as long as the cut doesn't split a surrogate pair. */
export function graphemePrefix(text: string, count: number): string {
  for (let take = count + 64; ; take *= 2) {
    if (take >= text.length) {
      const all = new Graphemes(text);
      return count >= all.count ? text : text.slice(0, all.start(count));
    }
    const high = text.charCodeAt(take - 1);
    const head = new Graphemes(text.slice(0, high >= 0xd800 && high <= 0xdbff ? take + 1 : take));
    // The head's last Character may go on past it; the ones before it are the text's.
    if (head.count > count) return text.slice(0, head.start(count));
  }
}

/** Swift's `hasPrefix`, which compares Characters: "#\u0301x" doesn't start with "#" (the mark makes "#\u0301" one
 *  Character). */
export function hasPrefix(text: string, prefix: string): boolean {
  if (!text.startsWith(prefix)) return false;
  if (prefix === "" || text.length === prefix.length) return true;
  // What follows the prefix decides whether its last Character goes on: a short window holds it.
  return new Graphemes(text.slice(0, prefix.length + 2)).isBoundary(prefix.length);
}

/** `Character.isWhitespace` for one character given as a string. */
export function isWhitespaceCharacter(character: string): boolean {
  return isWhiteSpace(character.codePointAt(0) ?? 0);
}

/** `Character.isLetter` (first scalar), `isNumber`, and the name-character test of CodeExtractor. */
export function isLetterCharacter(character: string): boolean {
  return LETTER.test(String.fromCodePoint(character.codePointAt(0) ?? 0));
}

export function isNumberCharacter(character: string): boolean {
  return NUMBER.test(String.fromCodePoint(character.codePointAt(0) ?? 0));
}

/** Whether any scalar is alphanumeric in Foundation's sense: letters, marks and numbers. */
function isWordCharacter(character: string): boolean {
  return ALPHANUMERIC.test(character);
}

// ---------------------------------------------------------------------------------------------------------------
// SearchText
// ---------------------------------------------------------------------------------------------------------------

/**
 * NFKC (Arabic presentation forms and ligatures become plain letters, full-width becomes ASCII, and Bengali's two
 * spellings of "ো" become one), invisible formatting characters dropped (Bengali's zero-width joiners, direction
 * marks), and Arabic the way people type it: no tatweel, no short-vowel marks, one alef.
 */
export function normalized(text: string): string {
  let out = "";
  for (const scalar of compatibilityComposed(text)) {
    const value = scalar.codePointAt(0)!;
    if (value === 0x200b) {
      out += " "; // zero-width space: a word break (Thai, Khmer)
    } else if (
      value === 0x00ad ||
      value === 0x061c ||
      (value >= 0x200c && value <= 0x200f) ||
      (value >= 0x202a && value <= 0x202e) ||
      (value >= 0x2060 && value <= 0x2064) ||
      (value >= 0x2066 && value <= 0x2069) ||
      value === 0xfeff
    ) {
      continue; // joiners, direction marks, soft hyphen, BOM
    } else if (value === 0x0640 || (value >= 0x064b && value <= 0x065f) || value === 0x0670) {
      continue; // tatweel; harakat and the dagger alef
    } else if (value === 0x0622 || value === 0x0623 || value === 0x0625 || value === 0x0671) {
      out += "\u0627"; // alef with hamza or madda, wasla → alef
    } else {
      out += scalar;
    }
  }
  return out;
}

/** Where Foundation's NFKC (`precomposedStringWithCompatibilityMapping`) doesn't compose: before a halfwidth voicing
 *  mark (ﾊﾟ is ハ and a mark, not パ), around a compatibility, halfwidth or circled Hangul letter, and between a Hangul
 *  syllable and a jamo after it. Checked against it on macOS 26. */
const NO_COMPOSITION = new RegExp(
  String.raw`(?=[\uff9e\uff9f\u3131-\u318e\uffa0-\uffdc\u3260-\u327e])|(?<=[\u3131-\u318e\uffa0-\uffdc\u3260-\u327e])` +
    String.raw`|(?<=[\uac00-\ud7a3])(?=[\u1160-\u11ff\ud7b0-\ud7ff])`,
  "u",
);
const COMPOSES_DIFFERENTLY = /[\uff9e\uff9f\u3131-\u318e\uffa0-\uffdc\u3260-\u327e\uac00-\ud7a3]/;

/** NFKC as Foundation does it: in pieces cut where it doesn't compose. */
function compatibilityComposed(text: string): string {
  if (!COMPOSES_DIFFERENTLY.test(text)) return text.normalize("NFKC");
  return text
    .split(NO_COMPOSITION)
    .map((piece) => piece.normalize("NFKC"))
    .join("");
}

const isIndic = (value: number) => value >= 0x0900 && value <= 0x0dff;
const isArabic = (value: number) => value >= 0x0600 && value <= 0x06ff;

/** True for words of scripts that attach endings to words (Bengali, Hindi, Arabic): keyword search matches them as
 *  prefixes, so "কুমির" finds "কুমিরও" and "مدرس" finds "مدرسة". */
export function inflects(word: string): boolean {
  for (const scalar of word) {
    const value = scalar.codePointAt(0)!;
    if (isIndic(value) || isArabic(value)) return true;
  }
  return false;
}

/** Whether text says something in words: at least a fifth of what isn't space is letters (marks count, such as
 *  Bengali vowel signs). A data dump or a table of numbers gets keyword search only. */
export function hasWords(text: string): boolean {
  let letters = 0;
  let others = 0;
  for (const scalar of text) {
    if (isSpaceOrNewline(scalar.codePointAt(0)!)) continue;
    if (LETTER_OR_MARK.test(scalar)) letters++;
    else others++;
  }
  return letters > 0 && letters * 4 >= others;
}

// Foundation's `.caseInsensitive` + `.diacriticInsensitive` search, as measured against Swift on macOS 26: every mark
// between two letters of its script, every precomposed letter, in both kinds of search range. A range of 65 code
// points or more ("long") also skips the Indic signs in `IGNORED_IN_LONG`, and keeps the four in `IGNORED_IN_SHORT`.

/** Nonspacing marks of the BMP that a short search doesn't skip: the vowel signs and viramas of Devanagari, Bengali
 *  and Gujarati (a long one skips them). Every other nonspacing mark of the BMP is skipped. */
// prettier-ignore
const KEPT_MARKS = /[\u093a\u0941-\u0948\u094d\u0955-\u0957\u0962\u0963\u09c1-\u09c4\u09cd\u09e2\u09e3\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3]/u;
/** Other marks it ignores: some spacing ones of South India and Southeast Asia, and combining Glagolitic. */
// prettier-ignore
const IGNORED_MARKS = /[\u0b3e\u0b57\u0bbe\u0bd7\u0cc0\u0cc2\u0cc7\u0cc8\u0cca\u0ccb\u0cd5\u0cd6\u0d3e\u0d57\u0dcf\u0ddf\u1715\u1734\u1b35\u1b3b\u1b3d\u1b43\u1b44\u1baa\u1bf2\u1bf3\u302e\u302f\ua953\ua9c0\u{1e000}-\u{1e006}\u{1e008}-\u{1e018}\u{1e01b}-\u{1e021}\u{1e023}\u{1e024}\u{1e026}-\u{1e02a}\u{1e08f}]/u;
// prettier-ignore
const IGNORED_IN_LONG = /[\u093a\u0941-\u0948\u094d\u0955-\u0957\u0962\u0963\u09be\u09c1-\u09c4\u09cd\u09d7\u09e2\u09e3\u0ac1-\u0ac5\u0ac7\u0ac8\u0acd\u0ae2\u0ae3]/u;
const IGNORED_IN_SHORT = /[\u0903\u0982\u0983\u0a83]/u;
const NONSPACING = /^[\p{Mn}\p{Me}]$/u;
const MARK = /^\p{M}$/u;
/** Devanagari letters with a nukta that a short search takes apart (ऩ is न there, not in a long one). */
const NUKTA_LETTERS = new Set(["\u0929", "\u0931", "\u0934"]);
/** Nuktas and the virama after each (Devanagari, Bengali, Gujarati): a short search doesn't end a match before them. */
const NUKTA_VIRAMA = new Map([
  [0x93c, 0x94d],
  [0x9bc, 0x9cd],
  [0xabc, 0xacd],
]);

/** Whether a short search can't end a match after code point `last`: a nukta and its virama follow it ("क" isn't
 *  in "क़्" there, though it is in "क़ु" and in a long range). */
function stopsBeforeNuktaVirama(scalars: readonly string[], last: number): boolean {
  const point = (at: number) => scalars[at]?.codePointAt(0) ?? 0;
  const virama = (at: number) => NUKTA_VIRAMA.get(point(at));
  if (virama(last + 1) !== undefined && virama(last + 1) === point(last + 2)) return true;
  if (virama(last) !== undefined && virama(last) === point(last + 1)) return true; // the word's own nukta
  return NUKTA_LETTERS.has(scalars[last]) && point(last + 1) === 0x94d;
}

/** One mark that a search of this kind skips, as a regex: a nonspacing mark of the BMP that isn't kept, or one of
 *  the others it ignores. */
function skippedMarkSource(long: boolean): string {
  const others = (long ? IGNORED_IN_LONG : IGNORED_IN_SHORT).source;
  return String.raw`(?:(?![\u{10000}-\u{10ffff}])(?!${KEPT_MARKS.source})[\p{Mn}\p{Me}]|${IGNORED_MARKS.source}|${others})`;
}
const SKIPPED = [false, true].map((long) => skippedMarkSource(long));
const IS_SKIPPED = SKIPPED.map((source) => new RegExp(`^${source}$`, "u"));

/** One code point of normalized, lowercased text as the search compares it (a mark it skips aside): a Latin, Greek or
 *  Cyrillic letter loses its accents; any other precomposed letter stays whole ("가" isn't in "각"). */
function foldScalar(scalar: string, long: boolean): string {
  if (!NON_ASCII.test(scalar) || MARK.test(scalar)) return scalar;
  const parts = scalar.normalize("NFD");
  if (parts === scalar) return scalar === "ß" ? "ss" : scalar === "ς" ? "σ" : scalar;
  const base = parts.codePointAt(0)!;
  return base < 0x510 || (!long && NUKTA_LETTERS.has(scalar)) ? String.fromCodePoint(base) : scalar;
}

/** The spellings of a whole precomposed letter that Foundation takes for it (canonical equivalence): itself, its
 *  decomposition, and for a Hangul syllable with a final consonant the syllable without it and the final jamo, which
 *  Foundation's NFKC leaves apart ("ｶﾞ" stays カ and a mark the same way). */
function spellings(letter: string): string[] {
  const all = [letter, letter.normalize("NFD")];
  const syllable = letter.charCodeAt(0) - 0xac00;
  if (syllable >= 0 && syllable < 11172 && syllable % 28 !== 0) {
    all.push(String.fromCharCode(letter.charCodeAt(0) - (syllable % 28), 0x11a7 + (syllable % 28)));
  }
  return all;
}

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);

/** What one kind of search sees of the text: each code point folded, and the marks it may skip. */
class FoldedText {
  readonly text: string;
  /** `starts[i]`: where the piece of code point `i` starts (and `starts[count]` the end). */
  readonly starts: number[] = [0];
  /** Whether code point `i` is a mark the search may skip, or match to the same mark of the word. */
  readonly skippable: boolean[] = [];
  /** The code point each UTF-16 unit of `text` came from. */
  private readonly points: number[] = [];

  constructor(scalars: readonly string[], long: boolean) {
    let text = "";
    scalars.forEach((scalar, index) => {
      const skippable = NON_ASCII.test(scalar) && IS_SKIPPED[long ? 1 : 0].test(scalar);
      const piece = skippable ? scalar : foldScalar(scalar, long);
      text += piece;
      for (let unit = 0; unit < piece.length; unit++) this.points.push(index);
      this.starts.push(text.length);
      this.skippable.push(skippable);
    });
    this.text = text;
  }

  pointAt(unit: number): number {
    return this.points[unit];
  }
}

/** The word as a pattern for one kind of search: its code points folded (a whole letter in any of its spellings), a
 *  mark the search skips optional, and any marks it skips allowed between them. Null when nothing of the word is left
 *  to find. */
function wordPattern(scalars: readonly string[], long: boolean): RegExp | null {
  let required = false;
  const parts = scalars.map((scalar, index) => {
    if (IS_SKIPPED[long ? 1 : 0].test(scalar)) return `(?:${escapeRegExp(scalar)})?`;
    required = true;
    const folded = foldScalar(scalar, long);
    const isWholeLetter = folded === scalar && folded.normalize("NFD") !== folded;
    const alternatives = isWholeLetter ? spellings(folded) : [folded];
    // A letter and a mark of the word that make a whole letter ("ﾊﾟ" as ハ and ゚) find that letter too.
    const composed = (scalar + (scalars[index + 1] ?? "")).normalize("NFC");
    if ([...composed].length === 1 && composed.codePointAt(0)! >= 0x510) alternatives.push(...spellings(composed));
    if (alternatives.length === 1) return escapeRegExp(folded);
    return `(?:${alternatives.map(escapeRegExp).join("|")})`;
  });
  return required ? new RegExp(parts.join(`${SKIPPED[long ? 1 : 0]}*`), "gu") : null;
}

/** A grapheme range [start, end) in a text. */
interface GraphemeRange {
  start: number;
  end: number;
}

/** A text as DigUp searches it: each character normalized and lowercased on its own, code point by code point, and
 *  folded for each kind of search when one needs it. */
class SearchedText {
  readonly scalars: string[] = [];
  /** The character each code point came from. */
  readonly owner: number[] = [];
  private readonly views: Array<FoldedText | undefined> = [undefined, undefined];

  constructor(readonly graphemes: Graphemes) {
    for (let index = 0; index < graphemes.count; index++) {
      for (const scalar of lowercased(normalized(graphemes.at(index)))) {
        this.scalars.push(scalar);
        this.owner.push(index);
      }
    }
  }

  folded(long: boolean): FoldedText {
    return (this.views[long ? 1 : 0] ??= new FoldedText(this.scalars, long));
  }
}

/** Where `word` is in the text as keyword search would find it, in grapheme indices. */
function matchGraphemes(word: string, text: SearchedText): GraphemeRange[] {
  const { scalars, owner, graphemes } = text;
  const wordScalars = [...lowercased(normalized(word))];
  const patterns = [false, true].map((long) => wordPattern(wordScalars, long));
  const prefix = inflects(word);
  const found: GraphemeRange[] = [];
  let from = 0; // a code point
  while (found.length < 500 && from < scalars.length) {
    const long = scalars.length - from >= 65;
    const pattern = patterns[long ? 1 : 0];
    if (!pattern) break;
    const folded = text.folded(long);
    const { starts, skippable } = folded;
    pattern.lastIndex = starts[from];
    const match = pattern.exec(folded.text);
    if (!match || match[0] === "") break;
    const hit = match.index;
    const after = hit + match[0].length;
    let first = folded.pointAt(hit);
    let last = folded.pointAt(after - 1);
    // Whole code points only, not right after a mark the search keeps (it goes with the letter before it), and the
    // hit takes along the marks after it that the search skips, and any nonspacing one.
    const afterKeptMark = first > 0 && MARK.test(scalars[first - 1]) && !skippable[first - 1];
    if (
      starts[first] !== hit ||
      starts[last + 1] !== after ||
      afterKeptMark ||
      (!long && stopsBeforeNuktaVirama(scalars, last))
    ) {
      from = first + 1;
      continue;
    }
    while (last + 1 < scalars.length && (skippable[last + 1] || NONSPACING.test(scalars[last + 1]))) last++;
    from = last + 1;
    first = owner[first];
    let end = owner[last] + 1;
    if (first > 0 && isWordCharacter(graphemes.at(first - 1))) continue;
    if (end < graphemes.count && isWordCharacter(graphemes.at(end))) {
      if (!prefix) continue;
      while (end < graphemes.count && isWordCharacter(graphemes.at(end))) end++;
    }
    const previous = found[found.length - 1];
    if (previous && previous.start < end && first < previous.end) continue;
    found.push({ start: first, end });
  }
  return found;
}

/**
 * Where `word` is in `text` as keyword search would find it (normalized, ignoring case and accents), as UTF-16 ranges
 * of the text as written: whole words, and for a word of a language that attaches endings, the whole word it starts
 * ("কুমির" marks all of "কুমিরের"). Never splits a letter from its vowel sign.
 */
export function matches(word: string, text: string): Array<{ start: number; end: number }> {
  const graphemes = new Graphemes(text);
  return matchGraphemes(word, new SearchedText(graphemes)).map((range) => ({
    start: graphemes.start(range.start),
    end: graphemes.start(range.end),
  }));
}

/** One line from `text` around the first of `terms` it has, the terms marked « » as SQLite's snippet() marks them:
 *  the excerpt of a keyword match, from the text as it's written. Null when none of the terms is in it. */
export function snippet(text: string, terms: string[], words = 12): string | null {
  const graphemes = new Graphemes(text);
  const searched = new SearchedText(graphemes);
  const marks = terms.flatMap((term) => matchGraphemes(term, searched)).sort((a, b) => a.start - b.start);
  const first = marks[0];
  if (!first) return null;
  // About `words` words, starting a few before the first match.
  let start = first.start;
  let before = 0;
  while (start > 0 && before < Math.trunc(words / 3)) {
    start--;
    if (graphemes.isWhitespace(start) && start < first.start && !graphemes.isWhitespace(start + 1)) before++;
  }
  if (start > 0 || graphemes.isWhitespace(start)) start++;
  let end = first.end;
  let after = 0;
  while (end < graphemes.count && after < words - before) {
    if (graphemes.isWhitespace(end)) after++;
    end++;
  }
  let out = start > 0 ? "…" : "";
  let cursor = start;
  for (const mark of marks) {
    if (mark.start < start || mark.end > end || mark.start < cursor) continue;
    out += graphemes.slice(cursor, mark.start) + "«" + graphemes.slice(mark.start, mark.end) + "»";
    cursor = mark.end;
  }
  out += graphemes.slice(cursor, end) + (end < graphemes.count ? "…" : "");
  return trimWhitespace(out.replace(new RegExp(`${WHITE_SPACE}+`, "gu"), " "));
}

// ---------------------------------------------------------------------------------------------------------------
// Landmark
// ---------------------------------------------------------------------------------------------------------------

/**
 * Words to search for in a PDF so its page is among the matches. `texts`: the PDF's own text (as PDFKit reads it) of
 * pages 1 through `page`. The first of `words` that's on that page, spelled as the page spells it, preferring one
 * that isn't on an earlier page. Null for page 1 (it opens there anyway), or when none of the words is on it.
 */
export function findLandmark(page: number, texts: string[], words: string[]): string | null {
  if (page <= 1 || texts.length < page) return null;
  const target = texts[page - 1];
  const before = texts.slice(0, page - 1).map((text) => lowercased(normalized(text)));
  const onPage: string[] = [];
  for (const word of words) {
    if (graphemeCount(word) < 3) continue;
    const hit = matches(word, target)[0];
    if (hit) onPage.push(target.slice(hit.start, hit.end));
  }
  const fresh = onPage.find((word) => {
    const needle = lowercased(normalized(word));
    return !before.some((text) => text.includes(needle));
  });
  return fresh ?? onPage[0] ?? null;
}

// ---------------------------------------------------------------------------------------------------------------
// PageTextProblem
// ---------------------------------------------------------------------------------------------------------------

/** What's wrong with the text PDFKit read from a page, when its text layer can't be used as it is. */
export type PageTextProblem =
  /** Bengali or Hindi read in glyph order: vowel signs ahead of their consonants. Use the page as a picture. */
  | "glyphOrder"
  /** Arabic letters lost where the font drew a lam ligature: a bare alef before "?" or "." or U+FFFD. Read it by OCR. */
  | "lostLetters";

/** Dependent vowel signs of Bengali and Devanagari: in a real word, each follows a consonant (or its nukta). */
function isIndicVowelSign(value: number): boolean {
  return (
    (value >= 0x09be && value <= 0x09c4) ||
    value === 0x09c7 ||
    value === 0x09c8 ||
    value === 0x09cb ||
    value === 0x09cc ||
    value === 0x09d7 ||
    value === 0x09e2 ||
    value === 0x09e3 ||
    value === 0x093a ||
    value === 0x093b ||
    (value >= 0x093e && value <= 0x094c) ||
    value === 0x094e ||
    value === 0x094f ||
    (value >= 0x0955 && value <= 0x0957) ||
    value === 0x0962 ||
    value === 0x0963
  );
}

function isIndicConsonantOrNukta(value: number): boolean {
  return (
    (value >= 0x0995 && value <= 0x09b9) ||
    value === 0x09bc ||
    value === 0x09ce ||
    value === 0x09dc ||
    value === 0x09dd ||
    value === 0x09df ||
    value === 0x09f0 ||
    value === 0x09f1 ||
    (value >= 0x0915 && value <= 0x0939) ||
    value === 0x093c ||
    (value >= 0x0958 && value <= 0x095f) ||
    (value >= 0x0979 && value <= 0x097f)
  );
}

const ALPHABETIC = /\p{Alphabetic}/u;

export function checkPageText(text: string): PageTextProblem | null {
  let vowelSigns = 0;
  let misplaced = 0;
  let lostLetters = 0;
  let previous = 0x20;
  let beforePrevious = 0x20;
  for (const scalar of text.normalize("NFC")) {
    const value = scalar.codePointAt(0)!;
    if (isIndicVowelSign(value)) {
      vowelSigns++;
      if (!isIndicConsonantOrNukta(previous)) misplaced++;
    }
    if (
      beforePrevious === 0x0627 &&
      (previous === 0x3f || previous === 0x2e || previous === 0xfffd) &&
      isArabic(value) &&
      ALPHABETIC.test(scalar)
    ) {
      lostLetters++;
    }
    beforePrevious = previous;
    previous = value;
  }
  if (vowelSigns >= 10 && misplaced * 20 >= vowelSigns) return "glyphOrder";
  if (lostLetters >= 2) return "lostLetters";
  return null;
}

// DigUp's names, for readers of the Swift: SearchText.normalized, PageTextProblem.check, Landmark.find.
export const SearchText = { normalized, inflects, hasWords, matches, snippet };
export const PageTextProblem = { check: checkPageText };
export const Landmark = { find: findLandmark };
