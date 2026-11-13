/* Copyright (c) 2022~present by tisfeng, maxchang3, All Rights Reserved. */

const MAX_STROKE_ORDER_CHARACTERS = 8;

const chineseLanguageCodes = new Set(["zh-CHS", "zh-CHT"]);
const unifiedIdeographPattern = /^\p{Unified_Ideograph}$/u;

interface TranslationTexts {
  readonly fromLanguage: string;
  readonly toLanguage: string;
  readonly sourceText: string;
  readonly translatedText: string;
}

/**
 * Extract unique Han characters while preserving their first-seen order.
 */
function extractUniqueHanzi(text: string): string[] {
  const characters: string[] = [];
  const seen = new Set<string>();

  for (const character of text.normalize("NFC")) {
    if (!unifiedIdeographPattern.test(character) || seen.has(character)) continue;

    seen.add(character);
    characters.push(character);
    if (characters.length === MAX_STROKE_ORDER_CHARACTERS) break;
  }

  return characters;
}

/**
 * Select Han characters from a translation's source and result according to
 * its language direction.
 */
export function getStrokeOrderCharacters({
  fromLanguage,
  toLanguage,
  sourceText,
  translatedText,
}: TranslationTexts): string[] {
  const texts: string[] = [];

  if (chineseLanguageCodes.has(fromLanguage)) texts.push(sourceText);
  if (chineseLanguageCodes.has(toLanguage)) texts.push(translatedText);

  return extractUniqueHanzi(texts.join(""));
}
