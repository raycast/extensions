import { readDataFile } from "./data-file";

// [character, [[tone-marked pinyin, frequency count], ...], definition, traditional forms ("/"-separated), standard index]
type RawEntry = [string, [string, number][], string, string, number];

export interface Reading {
  pinyin: string;
  syllable: string;
  tone: number;
  count: number;
}

export interface CharacterEntry {
  char: string;
  readings: Reading[];
  definition: string;
  traditional: string[];
  standardIndex: number;
}

export interface QueryToken {
  syllable: string;
  tone?: number;
  isPrefix: boolean;
}

export interface CharacterMatch {
  entry: CharacterEntry;
  readings: Reading[];
}

const TONE_MARKS: Record<string, number> = { "\u0304": 1, "\u0301": 2, "\u030c": 3, "\u0300": 4 };
const DIAERESIS = "\u0308";
export const NEUTRAL_TONE = 5;
const MAX_PREFIX_RESULTS = 100;

// Splits tone-marked pinyin such as "lǜ" into a plain syllable ("lv") and a tone number (4).
const parseReading = (pinyin: string): { syllable: string; tone: number } => {
  let syllable = "";
  let tone = NEUTRAL_TONE;
  for (const c of pinyin.normalize("NFD").toLowerCase()) {
    if (c in TONE_MARKS) tone = TONE_MARKS[c];
    else if (c === DIAERESIS && syllable.endsWith("u")) syllable = syllable.slice(0, -1) + "v";
    else if (c >= "a" && c <= "z") syllable += c;
  }
  return { syllable, tone };
};

const ENTRIES: CharacterEntry[] = readDataFile<RawEntry[]>("pinyin-index.json").map(
  ([char, readings, definition, traditional, standardIndex]) => ({
    char,
    readings: readings.map(([pinyin, count]) => ({ pinyin, count, ...parseReading(pinyin) })),
    definition,
    traditional: traditional ? traditional.split("/") : [],
    standardIndex,
  }),
);

const BY_CHAR = new Map(ENTRIES.map((entry) => [entry.char, entry]));
export const characterEntry = (char: string): CharacterEntry | undefined => BY_CHAR.get(char);

const BY_SYLLABLE = new Map<string, CharacterEntry[]>();
for (const entry of ENTRIES) {
  for (const syllable of new Set(entry.readings.map((reading) => reading.syllable))) {
    const list = BY_SYLLABLE.get(syllable) ?? [];
    list.push(entry);
    BY_SYLLABLE.set(syllable, list);
  }
}

const SYLLABLES = [...BY_SYLLABLE.keys()];
const SYLLABLE_PREFIXES = new Set(SYLLABLES.flatMap((s) => [...s].map((_, i) => s.slice(0, i + 1))));
const MAX_SYLLABLE_LENGTH = Math.max(...SYLLABLES.map((s) => s.length));

// Total Hanyu Pinlu count across all readings, for turning counts into probabilities.
export const TOTAL_READING_COUNT = ENTRIES.reduce(
  (sum, entry) => sum + entry.readings.reduce((entrySum, reading) => entrySum + reading.count, 0),
  0,
);

export const charactersForSyllable = (syllable: string): CharacterEntry[] => BY_SYLLABLE.get(syllable) ?? [];
export const syllablesStartingWith = (prefix: string): string[] => SYLLABLES.filter((s) => s.startsWith(prefix));

interface Span {
  start: number;
  end: number;
  isPrefix: boolean;
}

// Splits run-together pinyin ("nihao") into syllables, preferring longer syllables and
// backtracking when that leaves an unsplittable remainder. The final piece may be an
// incomplete syllable (a prefix) so results show up while the user is still typing.
const segment = (letters: string, start = 0): Span[] | null => {
  if (start === letters.length) return [];
  for (let end = Math.min(letters.length, start + MAX_SYLLABLE_LENGTH); end > start; end--) {
    if (!BY_SYLLABLE.has(letters.slice(start, end))) continue;
    const rest = segment(letters, end);
    if (rest) return [{ start, end, isPrefix: false }, ...rest];
  }
  if (SYLLABLE_PREFIXES.has(letters.slice(start))) return [{ start, end: letters.length, isPrefix: true }];
  return null;
};

// Accepts plain ("ma"), numbered ("ma3", "ni3hao3"), tone-marked ("mǎ", "nǐhǎo") and
// space/apostrophe separated input. "v", "u:" and "ü" are all treated as ü.
export const parseQuery = (input: string): QueryToken[] => {
  const tokens: QueryToken[] = [];
  let letters = "";
  let letterTones: (number | undefined)[] = [];

  const flush = (explicitTone?: number) => {
    if (!letters) return;
    const spans = segment(letters) ?? [{ start: 0, end: letters.length, isPrefix: true }];
    spans.forEach(({ start, end, isPrefix }, i) => {
      const markedTone = letterTones.slice(start, end).find((tone) => tone !== undefined);
      const tone = i === spans.length - 1 && explicitTone !== undefined ? explicitTone : markedTone;
      tokens.push({ syllable: letters.slice(start, end), tone, isPrefix });
    });
    letters = "";
    letterTones = [];
  };

  for (const c of input.normalize("NFD").toLowerCase()) {
    if (c >= "a" && c <= "z") {
      letters += c;
      letterTones.push(undefined);
    } else if (c in TONE_MARKS && letters) {
      letterTones[letterTones.length - 1] = TONE_MARKS[c];
    } else if ((c === DIAERESIS || c === ":") && letters.endsWith("u")) {
      letters = letters.slice(0, -1) + "v";
    } else if (c >= "0" && c <= "5") {
      flush(c === "0" ? NEUTRAL_TONE : Number(c));
    } else {
      flush();
    }
  }
  flush();
  return tokens;
};

const score = (readings: Reading[]) => readings.reduce((sum, reading) => sum + reading.count, 0);
const standardRank = (entry: CharacterEntry) => entry.standardIndex || Infinity;

export const lookup = (token: QueryToken): CharacterMatch[] => {
  const syllables = new Set(token.isPrefix ? syllablesStartingWith(token.syllable) : [token.syllable]);
  const matches = new Map<string, CharacterMatch>();

  for (const syllable of syllables) {
    for (const entry of BY_SYLLABLE.get(syllable) ?? []) {
      if (matches.has(entry.char)) continue;
      const readings = entry.readings.filter(
        (reading) => syllables.has(reading.syllable) && (token.tone === undefined || reading.tone === token.tone),
      );
      if (readings.length > 0) matches.set(entry.char, { entry, readings });
    }
  }

  const sorted = [...matches.values()].sort(
    (a, b) => score(b.readings) - score(a.readings) || standardRank(a.entry) - standardRank(b.entry),
  );
  return token.isPrefix ? sorted.slice(0, MAX_PREFIX_RESULTS) : sorted;
};

// Renders a syllable with its tone mark for display, e.g. ("lv", 4) -> "lǜ".
export const formatSyllable = (syllable: string, tone?: number): string => {
  const plain = syllable.replace(/v/g, "ü");
  if (tone === undefined || tone === NEUTRAL_TONE) return plain;
  const mark = Object.keys(TONE_MARKS).find((key) => TONE_MARKS[key] === tone) ?? "";
  const vowelIndex = /[ae]/.test(plain)
    ? plain.search(/[ae]/)
    : plain.includes("ou")
      ? plain.indexOf("o")
      : Math.max(...[..."iouü"].map((v) => plain.lastIndexOf(v)));
  if (vowelIndex < 0) return plain;
  return (plain.slice(0, vowelIndex + 1) + mark + plain.slice(vowelIndex + 1)).normalize("NFC");
};
