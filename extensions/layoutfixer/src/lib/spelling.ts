import { Dictionaries, normalize } from "./dictionaries";
import { detectLang, Lang } from "./layouts";

const ALPHABET: Record<Lang, string[]> = {
  en: Array.from("abcdefghijklmnopqrstuvwxyz"),
  fa: Array.from("ابپتثجچحخدذرزژسشصضطظعغفقکگلمنوهیآئءؤأ"),
};

/** Words longer than this only get single-edit suggestions; two edits would be too slow. */
const MAX_TWO_EDIT_LENGTH = 9;
/** An automatic correction must be at least this common... */
const AUTO_MAX_RANK = 15000;
/** ...and this many times more common than the runner-up. */
const AUTO_MARGIN = 3;

export interface Misspelling {
  /** Index of the word in the text's word list (see `splitWords`). */
  index: number;
  word: string;
  lang: Lang;
  suggestions: string[];
}

function edits1(word: string, lang: Lang): Set<string> {
  const chars = Array.from(word);
  const result = new Set<string>();
  for (let i = 0; i <= chars.length; i++) {
    const left = chars.slice(0, i).join("");
    const right = chars.slice(i);
    if (right.length) result.add(left + right.slice(1).join(""));
    if (right.length > 1) result.add(left + right[1] + right[0] + right.slice(2).join(""));
    for (const c of ALPHABET[lang]) {
      if (right.length) result.add(left + c + right.slice(1).join(""));
      result.add(left + c + right.join(""));
    }
  }
  result.delete(word);
  return result;
}

/** Copies the casing of `original` onto `suggestion` (Teh → The, TEH → THE). */
function matchCase(original: string, suggestion: string): string {
  if (original.length > 1 && original === original.toUpperCase() && original !== original.toLowerCase())
    return suggestion.toUpperCase();
  if (original[0] && original[0] !== original[0].toLowerCase())
    return suggestion[0].toUpperCase() + suggestion.slice(1);
  return suggestion;
}

/** The part of a word that gets checked, without surrounding punctuation. */
export function wordCore(token: string): { before: string; core: string; after: string } {
  const match = token.match(/^([\p{P}\p{S}]*)(.*?)([\p{P}\p{S}]*)$/su);
  return match ? { before: match[1], core: match[2], after: match[3] } : { before: "", core: token, after: "" };
}

/** Whether a word should be spell-checked at all: no URLs, numbers, acronyms or camelCase. */
export function isCheckable(word: string): boolean {
  if (Array.from(word).length < 3) return false;
  if (/[\p{N}@/\\_.:#]/u.test(word)) return false;
  if (/\p{Script=Latin}/u.test(word) && /\p{Script=Arabic}/u.test(word)) return false;
  if (/^\p{Script=Latin}/u.test(word)) {
    if (!/^[\p{Script=Latin}'’-]+$/u.test(word)) return false;
    if (word.length > 1 && word === word.toUpperCase()) return false;
    if (/\p{Ll}\p{Lu}/u.test(word)) return false;
  }
  return true;
}

export class Speller {
  private readonly cache = new Map<string, ReturnType<Speller["search"]>>();

  constructor(private readonly dicts: Dictionaries) {}

  isCorrect(word: string, lang: Lang): boolean {
    return this.dicts.isWord(word, lang) || this.dicts.isWord(word.replace(/['’]s$/, ""), lang);
  }

  /** Real words close to `word`, closest and most common first. */
  suggest(word: string, lang: Lang, max = 6): string[] {
    return this.candidates(word, lang, max).map((c) => matchCase(word, c.word));
  }

  /** A correction confident enough to apply without asking, if there is one. */
  autoCorrect(word: string, lang: Lang): string | undefined {
    if (!isCheckable(word) || this.isCorrect(word, lang)) return undefined;
    const [best, second] = this.candidates(word, lang, 2, false);
    if (!best || best.rank > AUTO_MAX_RANK) return undefined;
    if (second && second.rank < best.rank * AUTO_MARGIN) return undefined;
    return matchCase(word, best.word);
  }

  private candidates(word: string, lang: Lang, max: number, twoEdits = true) {
    const key = `${lang}:${max}:${twoEdits}:${normalize(word)}`;
    let result = this.cache.get(key);
    if (!result) {
      result = this.search(normalize(word), lang, max, twoEdits);
      this.cache.set(key, result);
    }
    return result;
  }

  private search(w: string, lang: Lang, max: number, twoEdits: boolean) {
    const ranked = (words: Iterable<string>, distance: number) =>
      Array.from(words)
        .map((c) => ({ word: c, rank: this.dicts.rank(c, lang), distance }))
        .filter((c): c is { word: string; rank: number; distance: number } => c.rank !== undefined)
        .sort((a, b) => a.rank - b.rank);

    const first = edits1(w, lang);
    const result = ranked(first, 1);
    if (twoEdits && result.length < max && Array.from(w).length <= MAX_TWO_EDIT_LENGTH) {
      const seen = new Set([w, ...first]);
      const second = new Set<string>();
      for (const e of first) for (const e2 of edits1(e, lang)) if (!seen.has(e2)) second.add(e2);
      result.push(...ranked(second, 2).slice(0, max - result.length));
    }
    return result.slice(0, max);
  }

  /** Every misspelled word in `text`, with suggestions. Words are numbered as in `splitWords`. */
  check(text: string, max = 6): Misspelling[] {
    const result: Misspelling[] = [];
    splitWords(text).forEach((token, index) => {
      const { core } = wordCore(token);
      const lang = detectLang(core);
      if (!lang || !isCheckable(core) || this.isCorrect(core, lang)) return;
      result.push({ index, word: core, lang, suggestions: this.suggest(core, lang, max) });
    });
    return result;
  }
}

/** The words of `text`, in order. Whitespace-separated, punctuation stays attached. */
export function splitWords(text: string): string[] {
  return text.split(/(\s+)/).filter((_, i) => i % 2 === 0);
}

/** Replaces word `index` (as numbered by `splitWords`) with `replacement`, keeping its punctuation. */
export function replaceWords(text: string, replacements: Map<number, string>): string {
  const tokens = text.split(/(\s+)/);
  return tokens
    .map((token, i) => {
      const replacement = i % 2 === 0 ? replacements.get(i / 2) : undefined;
      if (replacement === undefined) return token;
      const { before, after } = wordCore(token);
      return before + replacement + after;
    })
    .join("");
}
