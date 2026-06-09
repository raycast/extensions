import * as OpenCC from "opencc-js";
import { DictEntry } from "./storage";

export type Direction = "s2t" | "t2s";

const simplifiedToTraditional = OpenCC.Converter({ from: "cn", to: "tw" });
const traditionalToSimplified = OpenCC.Converter({ from: "tw", to: "cn" });

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
  const asTraditional = simplifiedToTraditional(text);
  const asSimplified = traditionalToSimplified(text);

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
  const converter =
    direction === "s2t" ? simplifiedToTraditional : traditionalToSimplified;
  return { text: converter(withDictionary), direction };
}
