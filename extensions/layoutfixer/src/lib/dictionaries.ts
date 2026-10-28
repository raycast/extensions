import { readFileSync } from "fs";
import { join } from "path";
import { Lang } from "./layouts";

/** Only the most common Persian words count as a real reading; the long tail of the list is noisy. */
const FA_LIMIT = 30000;
/** Short words next to a mistake only count as English when they are at least this common. */
const SHORT_EN_LIMIT = 20000;

/** ", ; ' [ ]" are Persian letters on English keys (و ک گ ج چ), so they can sit inside a word. */
const PERSIAN_KEYS = new Set([",", ";", "'", "[", "]"]);

const EDGE_PUNCTUATION = /^[\p{P}\p{S}\s]+|[\p{P}\p{S}\s]+$/gu;

/** The Persian list spells words without half-spaces (میخوام), so they are dropped before lookups. */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replaceAll("ي", "ی")
    .replaceAll("ك", "ک")
    .replace(/\u200c|\u200d|\u0640/g, "")
    .replace(EDGE_PUNCTUATION, "");
}

function letterCount(s: string): number {
  return Array.from(s).length;
}

function ranks(text: string): Map<string, number> {
  const result = new Map<string, number>();
  text.split("\n").forEach((line, i) => {
    const word = line.split(" ")[0];
    if (!word) return;
    const w = normalize(word);
    if (w && !result.has(w)) result.set(w, i);
  });
  return result;
}

/**
 * Decides whether a word was typed on the wrong layout, in either direction.
 * A word is only flagged when the other reading is a real word, so names, brands
 * and typos ("github", "teh") are left alone.
 */
export class Dictionaries {
  /** Rank in the English frequency list (0 = most common). */
  readonly enRank: Map<string, number>;
  /** Rank in the Persian frequency list. */
  readonly faRank: Map<string, number>;
  /** Every English word we know, including rare ones from the system word list. */
  private readonly enAll: Set<string>;
  /** English words from the system word list only; the frequency list's long tail has noise like "lk". */
  private readonly enSystem = new Set<string>();
  /** Words from the personal dictionary: never converted and always spelled right. */
  private personal = new Set<string>();

  constructor(en: string, fa: string, extraEnglish = "") {
    this.enRank = ranks(en);
    this.faRank = ranks(fa);
    this.enAll = new Set(this.enRank.keys());
    for (const line of extraEnglish.split("\n")) {
      if (!line) continue;
      this.enAll.add(line.toLowerCase());
      this.enSystem.add(line.toLowerCase());
    }
  }

  /** A real English word for deciding about short words: in the system list or a common word. */
  private isCommonEnglish(w: string): boolean {
    return this.enSystem.has(w) || (this.enRank.get(w) ?? Infinity) < SHORT_EN_LIMIT;
  }

  /** Loads the bundled word lists from `directory`, plus macOS's /usr/share/dict/words when present. */
  static load(directory: string): Dictionaries {
    let words = "";
    try {
      words = readFileSync("/usr/share/dict/words", "utf8");
    } catch {
      // Not every system ships a word list; the frequency list still covers common words.
    }
    return new Dictionaries(
      readFileSync(join(directory, "en_50k.txt"), "utf8"),
      readFileSync(join(directory, "fa_50k.txt"), "utf8"),
      words,
    );
  }

  setPersonalWords(words: Iterable<string>): void {
    this.personal = new Set(Array.from(words, normalize).filter(Boolean));
  }

  isPersonal(word: string): boolean {
    return this.personal.has(normalize(word));
  }

  private persianRank(s: string): number | undefined {
    const r = this.faRank.get(normalize(s));
    return r !== undefined && r < FA_LIMIT ? r : undefined;
  }

  /** True when `word` is a real word in `lang` as written. */
  isWord(word: string, lang: Lang): boolean {
    const w = normalize(word);
    return this.personal.has(w) || (lang === "en" ? this.enAll.has(w) : this.faRank.has(w));
  }

  /** Frequency rank of `word` (lower is more common), if it is in the frequency list. */
  rank(word: string, lang: Lang): number | undefined {
    return (lang === "en" ? this.enRank : this.faRank).get(normalize(word));
  }

  /**
   * True when `typed` was typed on the wrong layout and `converted` is what was meant.
   * `minLetters` guards against short words, which are often ambiguous (شد is "an" on English keys).
   */
  isMistake(typed: string, typedLang: Lang, converted: string, minLetters = 3): boolean {
    if (this.isPersonal(typed)) return false;
    if (typedLang === "fa") {
      // Typed on Persian keys: the English reading must be a common English word,
      // and more common than the Persian word itself if the typed text is real Persian.
      const english = normalize(converted);
      const en = this.enRank.get(english);
      const ascii = Array.from(english).every((c) => c.charCodeAt(0) < 128);
      if (letterCount(english) < minLetters || !ascii || en === undefined) return false;
      const fa = this.persianRank(typed);
      return fa === undefined || en < fa;
    }
    // Typed on English keys: never touch a real English word, and only suggest Persian
    // when the Persian reading is a real Persian word.
    const english = normalize(typed);
    const chars = Array.from(english);
    if (
      chars.length < minLetters ||
      !chars.every((c) => /\p{L}/u.test(c) || PERSIAN_KEYS.has(c)) ||
      !chars.some((c) => /\p{L}/u.test(c)) ||
      (minLetters < 3 && chars.length < 3 ? this.isCommonEnglish(english) : this.enAll.has(english))
    )
      return false;
    // don't, it's, ...
    if (english.includes("'") && this.enAll.has(english.split("'")[0])) return false;
    return this.persianRank(converted) !== undefined;
  }
}
