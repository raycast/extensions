import { SupportedLanguage } from "../types/language";

const JAPANESE_REGEX = /[\u3040-\u30ff\u31f0-\u31ff\uff66-\uff9f]/g;
const HAN_REGEX = /[\u4e00-\u9fff]/g;
const LATIN_REGEX = /[A-Za-z]/g;
const DEFAULT_LANGUAGE: SupportedLanguage = "en";
const MIN_HAN_CHAR_COUNT = 1;
const HAN_TO_LATIN_RATIO = 0.2;

function countMatches(text: string, regex: RegExp): number {
  return text.match(regex)?.length ?? 0;
}

export function detectLanguageFromText(text: string): SupportedLanguage {
  const trimmedText = text.trim();
  if (!trimmedText) {
    return DEFAULT_LANGUAGE;
  }

  const japaneseCount = countMatches(trimmedText, JAPANESE_REGEX);
  if (japaneseCount > 0) {
    return "ja";
  }

  const hanCount = countMatches(trimmedText, HAN_REGEX);
  const latinCount = countMatches(trimmedText, LATIN_REGEX);
  const minimumHanCount = Math.max(
    MIN_HAN_CHAR_COUNT,
    Math.floor(latinCount * HAN_TO_LATIN_RATIO),
  );
  if (hanCount > 0 && hanCount >= minimumHanCount) {
    return "zh";
  }

  return DEFAULT_LANGUAGE;
}

export function inferDefaultTargetLanguage(
  sourceLanguage: SupportedLanguage,
): SupportedLanguage {
  if (sourceLanguage === "zh") {
    return "en";
  }

  return "zh";
}
