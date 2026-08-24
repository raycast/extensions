export const COMPACT_SOURCE_LIMIT = 140;
export const COMPACT_TRANSLATION_LIMIT = 105;

export function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function isCompactText(text: string) {
  return compactText(text).length <= COMPACT_SOURCE_LIMIT;
}

export function shouldShowCompactTranslation(translatedText: string) {
  return compactText(translatedText).length <= COMPACT_TRANSLATION_LIMIT;
}

export function previewText(text: string) {
  const compactTranslation = compactText(text);
  if (compactTranslation.length <= COMPACT_TRANSLATION_LIMIT) {
    return compactTranslation;
  }

  return `${compactTranslation.slice(0, COMPACT_TRANSLATION_LIMIT - 1)}...`;
}
