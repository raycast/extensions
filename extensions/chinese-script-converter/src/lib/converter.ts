import * as OpenCC from "opencc-js";
import STCharacters from "opencc-js/dict/STCharacters";
import TSCharacters from "opencc-js/dict/TSCharacters";
import { DictEntry } from "./storage";

export type Direction = "s2t" | "t2s";

type ConvertFn = (text: string) => string;

// Building the Simplified→Traditional converter loads the ~1 MB STPhrases
// dictionary and takes ~100 ms, while Traditional→Simplified is only ~3 ms.
// Previously both were created at module load, so every cold-started command
// invocation paid the ~100 ms cost *before* the selection was even copied.
// We now build each full converter lazily and memoize it, so only the one
// actually needed is created, and only after the text has been grabbed.
let simplifiedToTraditional: ConvertFn | null = null;
let traditionalToSimplified: ConvertFn | null = null;

function getConverter(direction: Direction): ConvertFn {
  if (direction === "s2t") {
    return (simplifiedToTraditional ??= OpenCC.Converter({
      from: "cn",
      to: "tw",
    }));
  }
  return (traditionalToSimplified ??= OpenCC.Converter({
    from: "tw",
    to: "cn",
  }));
}

// Lightweight character-only converters used solely for direction detection.
// They load the tiny ST/TS character tables (a few ms total) instead of the
// heavy phrase tables, yet produce the same detection result as the full
// converters because the heuristic below only counts changed characters.
let detectToTraditional: ConvertFn | null = null;
let detectToSimplified: ConvertFn | null = null;

/**
 * Count how many characters differ between two strings, comparing position by
 * position. Used as a cheap heuristic to detect the dominant script of a text.
 */
function countDifferences(a: string, b: string): number {
  const len = Math.min(a.length, b.length);
  let diff = Math.abs(a.length - b.length);
  for (let i = 0; i < len; i++) {
    if (a[i] !== b[i]) {
      diff++;
    }
  }
  return diff;
}

/**
 * Detect whether the text is mostly Simplified or Traditional Chinese.
 * - If converting to Traditional changes more characters, the text is Simplified.
 * - Otherwise it is treated as Traditional.
 */
export function detectDirection(text: string): Direction {
  detectToTraditional ??= OpenCC.CustomConverter(STCharacters);
  detectToSimplified ??= OpenCC.CustomConverter(TSCharacters);

  const asTraditional = detectToTraditional(text);
  const asSimplified = detectToSimplified(text);

  const simplifiedScore = countDifferences(text, asTraditional);
  const traditionalScore = countDifferences(text, asSimplified);

  return simplifiedScore >= traditionalScore ? "s2t" : "t2s";
}

/**
 * Escape a string so it can be used safely inside a RegExp.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Apply the user dictionary to the text for the given direction. Custom rules
 * are applied before OpenCC so they take precedence over character-level
 * conversion. The replacement target is already in the destination script, so
 * the later OpenCC pass leaves it untouched.
 */
function applyDictionary(
  text: string,
  direction: Direction,
  dictionary: DictEntry[],
): string {
  const rules = dictionary
    .map((entry) => ({
      from: direction === "s2t" ? entry.simplified : entry.traditional,
      to: direction === "s2t" ? entry.traditional : entry.simplified,
    }))
    .filter((rule) => rule.from.length > 0)
    // Apply longer source phrases first so a short rule (e.g. 程式) does not
    // clobber part of a longer one (e.g. 程式設計).
    .sort((a, b) => b.from.length - a.from.length);

  let result = text;
  for (const rule of rules) {
    result = result.replace(new RegExp(escapeRegExp(rule.from), "g"), rule.to);
  }
  return result;
}

export interface ConversionResult {
  text: string;
  direction: Direction;
}

/**
 * Convert text between Traditional and Simplified Chinese. The direction is
 * detected automatically, the user dictionary is applied first, then OpenCC
 * handles the remaining characters.
 */
export function convertText(
  text: string,
  dictionary: DictEntry[] = [],
): ConversionResult {
  const direction = detectDirection(text);
  const withDictionary = applyDictionary(text, direction, dictionary);
  const converter = getConverter(direction);
  return { text: converter(withDictionary), direction };
}
