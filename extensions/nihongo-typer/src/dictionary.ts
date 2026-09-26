import * as wanakana from "wanakana";
import kanjiDictionaryData from "./data/kanji-dictionary.json";
import { KANJI_SCRIPT } from "./romaji";

export interface KanjiCandidate {
  kanji: string;
  gloss: string;
  pos?: string;
  // Only present (and only ever `true`) on entries JMdict marks common — the
  // build script omits it otherwise to keep the bundled file small.
  common?: boolean;
}

export interface ReadingCandidate {
  reading: string;
  gloss: string;
  pos?: string;
  common?: boolean;
}

export const kanjiDictionary = new Map<string, KanjiCandidate[]>(
  kanjiDictionaryData.entries as [string, KanjiCandidate[]][],
);

// JMdict carries no JLPT levels, so the tag shown next to a dictionary result is
// its part of speech, which JMdict does have. Codes are expanded through the
// label table the build script emits alongside the entries.
const posLabels = new Map<string, string>(
  kanjiDictionaryData.posLabels as [string, string][],
);

export function posTag(pos?: string): string | undefined {
  return pos ? (posLabels.get(pos) ?? pos) : undefined;
}

// Reverse index (kanji spelling -> possible readings), built once from the same
// data: wanakana has no kanji-reading knowledge (that needs a morphological
// analyzer like MeCab/Kuromoji), so pasted Kanji can only be read back via an
// exact-match lookup against this bundled dictionary, not via wanakana.toRomaji.
// It is built lazily on the first Kanji lookup rather than at module load: inverting
// the whole dictionary is a 30k+ iteration pass that would otherwise run on every
// launch, including the common case where the user only ever types Romaji.
let kanjiToReadings: Map<string, ReadingCandidate[]> | undefined;

export function readingsForKanji(kanji: string): ReadingCandidate[] {
  if (!kanjiToReadings) {
    kanjiToReadings = new Map<string, ReadingCandidate[]>();
    for (const [reading, candidates] of kanjiDictionary) {
      for (const candidate of candidates) {
        let readings = kanjiToReadings.get(candidate.kanji);
        if (!readings) {
          readings = [];
          kanjiToReadings.set(candidate.kanji, readings);
        }
        readings.push({
          reading,
          gloss: candidate.gloss,
          pos: candidate.pos,
          common: candidate.common,
        });
      }
    }
  }
  return kanjiToReadings.get(kanji) ?? [];
}

// wanakana cannot read Kanji, so romanizing it directly either echoes the input
// back (猫 -> 猫) or, worse, half-converts it (食べる -> "食beru"). Kanji goes
// through the dictionary instead.
//
// Roughly a tenth of Kanji spellings have more than one reading (案 is あん
// "plan" or つくえ "desk"), and the reverse index's order is just dictionary
// insertion order, not likelihood. Silently taking the first entry would paste
// an arbitrary reading into the user's document, so the result is explicit: a
// single reading, or the one JMdict marks common when exactly one is, otherwise
// `ambiguous` for the caller to refuse.
export type JapaneseRomaji =
  | { kind: "ok"; romaji: string }
  | { kind: "unknown" }
  | { kind: "ambiguous"; readings: ReadingCandidate[] };

export function romajiForJapanese(text: string): JapaneseRomaji {
  if (!KANJI_SCRIPT.test(text)) {
    return { kind: "ok", romaji: wanakana.toRomaji(text) };
  }

  const readings = readingsForKanji(text);
  if (readings.length === 0) return { kind: "unknown" };

  const chosen =
    readings.length === 1
      ? readings[0]
      : readings.filter((r) => r.common).length === 1
        ? readings.find((r) => r.common)
        : undefined;

  return chosen
    ? { kind: "ok", romaji: wanakana.toRomaji(chosen.reading) }
    : { kind: "ambiguous", readings };
}
