import { Dictionaries } from "./dictionaries";
import { convert, detectLang, Lang, LayoutPair } from "./layouts";
import { toLatinDigits } from "./persian";
import { Speller, wordCore } from "./spelling";

export type FixMode = "smart" | "all";
export type Change = "layout" | "capsLock" | "spelling";

export interface FixOptions {
  mode: FixMode;
  /** In smart mode, convert everything when no word looks wrong. */
  fallbackToAll: boolean;
  /** Handle text typed with Caps Lock on (hELLO → Hello, SGHL → سلام). */
  capsLock: boolean;
  /** Correct confident spelling mistakes in converted words. */
  speller?: Speller;
  /** Digits typed on the English keys become ۱۲۳ when converted to Persian; otherwise they stay 123. */
  persianDigits: boolean;
}

export const DEFAULT_OPTIONS: FixOptions = { mode: "smart", fallbackToAll: false, capsLock: true, persianDigits: true };

export interface FixResult {
  text: string;
  /** The language the fixed words were converted into, or null if no layout fix was made. */
  target: Lang | null;
  changes: Set<Change>;
}

type Status = "wrong" | "short" | "unknown" | "neutral" | "keep";

const other = (lang: Lang): Lang => (lang === "en" ? "fa" : "en");

/** Caps Lock with Shift on the first letter: hELLO. */
const INVERTED_CASE = /^\p{Ll}\p{Lu}+$/u;
/** All capitals typed on the English keys, which could be Persian typed with Caps Lock on. */
const ALL_CAPS = /^[\p{Lu},;'[\]]{2,}$/u;

function invertCase(word: string): string {
  return Array.from(word, (c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("");
}

/**
 * Fixes words typed on the wrong layout. In smart mode only runs of words that look
 * mistyped are converted; everything else, including names like "github", is left alone.
 * Each word's direction comes from its own script, so one text can hold both kinds of mistake.
 */
export function fixText(
  text: string,
  dicts: Dictionaries,
  pair: LayoutPair,
  options: Partial<FixOptions> = {},
): FixResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const changes = new Set<Change>();
  const toTarget = (word: string, from: Lang) => {
    let converted = convert(word, pair[from], pair[other(from)]);
    if (from === "en" && !opts.persianDigits) converted = toLatinDigits(converted);
    const corrected = opts.speller && convertedSpelling(converted, other(from), opts.speller);
    if (corrected && corrected !== converted) {
      changes.add("spelling");
      return corrected;
    }
    return converted;
  };

  const capsSource = (word: string, lang: Lang | null) =>
    opts.capsLock && lang === "en" && ALL_CAPS.test(word) && !dicts.isWord(word, "en") ? word.toLowerCase() : word;

  if (opts.mode === "all") {
    const lang = detectLang(text);
    if (!lang) return { text, target: null, changes };
    const fixed = text
      .split(/(\s+)/)
      .map((token, i) => (i % 2 === 0 && token ? toTarget(capsSource(token, lang), lang) : token))
      .join("");
    if (fixed !== text) changes.add("layout");
    return { text: fixed, target: fixed === text ? null : other(lang), changes };
  }

  // Even indices are words, odd indices the whitespace between them.
  const tokens = text.split(/(\s+)/);
  const words = tokens.filter((_, i) => i % 2 === 0);
  const langs = words.map((word) => (/[\p{L}\p{N}]/u.test(word) ? detectLang(word) : null));
  /** The text each word is read as: lowercased when it looks like Persian typed with Caps Lock. */
  const sources = words.map((word, i) => capsSource(word, langs[i]));

  const status = words.map((word, i): Status => {
    const lang = langs[i];
    if (!lang) return "neutral";
    if (dicts.isPersonal(word)) return "keep";
    if (lang === "en" ? /\p{Script=Arabic}/u.test(word) : /\p{Script=Latin}/u.test(word)) return "keep";
    const source = sources[i];
    const converted = convert(source, pair[lang], pair[other(lang)]);
    if (dicts.isMistake(source, lang, converted)) return "wrong";
    if (dicts.isMistake(source, lang, converted, 1)) return "short";
    return dicts.isWord(word, lang) ? "keep" : "unknown";
  });

  /** The language each word is converted from, if it is part of a mistake. */
  const convertFrom = new Array<Lang | null>(words.length).fill(null);
  const sameRun = (j: number, lang: Lang) => status[j] === "neutral" || (langs[j] === lang && status[j] !== "keep");
  for (let i = 0; i < words.length; i++) {
    const lang = langs[i];
    if (status[i] !== "wrong" || !lang) continue;
    // A short word just before (like هد → "in") is usually part of the same mistake.
    let start = i;
    while (start > 0 && sameRun(start - 1, lang) && status[start - 1] !== "unknown") start--;
    while (start < i && status[start] !== "short") start++;
    // Words between two wrong ones are part of the same mistake unless they are real words as typed.
    let end = i;
    for (let j = i + 1; j < words.length && sameRun(j, lang); j++) {
      if (status[j] === "wrong" || status[j] === "short") end = j;
    }
    for (let k = start; k <= end; k++) convertFrom[k] = lang;
    i = end;
  }

  if (opts.fallbackToAll && !convertFrom.some(Boolean)) {
    const nearbyLang = (i: number): Lang | null => {
      for (let j = i - 1; j >= 0; j--) if (langs[j]) return langs[j];
      for (let j = i + 1; j < langs.length; j++) if (langs[j]) return langs[j];
      return detectLang(text);
    };
    for (let i = 0; i < words.length; i++) {
      if (dicts.isPersonal(words[i])) continue;
      if (opts.capsLock && INVERTED_CASE.test(words[i]) && dicts.isWord(words[i], "en")) continue;
      const lang = langs[i] ?? nearbyLang(i);
      if (lang) convertFrom[i] = lang;
    }
  }

  let target: Lang | null = null;
  const fixed = tokens.map((token, i) => {
    if (i % 2 === 1) return token;
    const from = convertFrom[i / 2];
    if (from) {
      target ??= other(from);
      changes.add("layout");
      return toTarget(sources[i / 2], from);
    }
    if (opts.capsLock && INVERTED_CASE.test(token) && dicts.isWord(token, "en")) {
      changes.add("capsLock");
      return invertCase(token);
    }
    return token;
  });
  return { text: fixed.join(""), target, changes };
}

/** A confident spelling correction for a freshly converted word, keeping its punctuation. */
function convertedSpelling(word: string, lang: Lang, speller: Speller): string | undefined {
  const { before, core, after } = wordCore(word);
  const corrected = speller.autoCorrect(core, lang);
  return corrected ? before + corrected + after : undefined;
}
