import { countTokens as countTokensCl100k } from "gpt-tokenizer/encoding/cl100k_base";
import { countTokens as countTokensO200k } from "gpt-tokenizer/encoding/o200k_base";

export interface CountResult {
  lines: number;
  words: number;
  sentences: number;
  paragraphs: number;
  /** Human-perceived characters (grapheme clusters), so emoji and combined characters count as 1 */
  characters: number;
  charactersNoSpaces: number;
  /** Estimated reading time in minutes (decimal) */
  readingTimeMinutes: number;
  /** Exact count for the o200k_base encoding (GPT-4o, o-series) */
  tokensO200k: number;
  /** Exact count for the cl100k_base encoding (GPT-4, GPT-3.5-turbo) */
  tokensCl100k: number;
  /** Rough estimate — Claude 3+ tokenizers are not public; cl100k_base is used as a proxy */
  tokensClaudeEstimate: number;
}

// CJK scripts (Han, Kana, Hangul) have no word-delimiting spaces:
// count each CJK character as one word (same convention as Word/Pages)
const CJK_REGEX = /[぀-ヿ㐀-䶿一-鿿豈-﫿가-힯]/g;

// Average reading speeds: ~200 words/min for space-delimited scripts,
// ~300 characters/min for CJK text
const WORDS_PER_MINUTE = 200;
const CJK_CHARS_PER_MINUTE = 300;

function countGraphemes(text: string): number {
  if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
    let count = 0;
    for (const _ of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text)) count++;
    return count;
  }
  // Fallback: code points (still better than UTF-16 units)
  return [...text].length;
}

export function countText(text: string): CountResult {
  const lines = text.split(/\r\n|\r|\n/).length;

  const cjkWordCount = (text.match(CJK_REGEX) || []).length;
  const nonCjkWords = text
    .replace(CJK_REGEX, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => /[\p{L}\p{N}]/u.test(word));
  const words = cjkWordCount + nonCjkWords.length;

  const characters = countGraphemes(text);
  const charactersNoSpaces = countGraphemes(text.replace(/\s/g, ""));

  // Latin terminators need trailing whitespace/end so "3.14" or "e.g." mid-sentence
  // don't count; CJK terminators (。！？…) count anywhere since they aren't followed by spaces
  const sentenceRegex = /[.!?]+[\s\n]+|[.!?]+$|[。！？…]+/g;
  const sentenceMatches = text.match(sentenceRegex);
  const sentences = sentenceMatches ? sentenceMatches.length : text.trim().length > 0 ? 1 : 0;

  const paragraphs =
    text
      .split(/\n\s*\n|\r\n\s*\r\n|\r\s*\r/)
      .map((p) => p.trim())
      .filter((p) => p.length > 0).length || (text.trim().length > 0 ? 1 : 0);

  const readingTimeMinutes = nonCjkWords.length / WORDS_PER_MINUTE + cjkWordCount / CJK_CHARS_PER_MINUTE;

  let tokensO200k = 0;
  let tokensCl100k = 0;
  try {
    const options = { allowedSpecial: "all" as const };
    tokensO200k = countTokensO200k(text, options);
    tokensCl100k = countTokensCl100k(text, options);
  } catch (e) {
    console.error("Failed to count tokens:", e);
    // Fallback: ~4 characters per token on average
    tokensO200k = Math.ceil(text.length / 4);
    tokensCl100k = tokensO200k;
  }

  return {
    lines,
    words,
    sentences,
    paragraphs,
    characters,
    charactersNoSpaces,
    readingTimeMinutes,
    tokensO200k,
    tokensCl100k,
    tokensClaudeEstimate: tokensCl100k,
  };
}

export function formatReadingTime(minutes: number): string {
  if (minutes <= 0) return "0 min";
  if (minutes < 1) return `${Math.max(1, Math.round(minutes * 60))} sec`;
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return m > 0 ? `${h} h ${m} min` : `${h} h`;
}
