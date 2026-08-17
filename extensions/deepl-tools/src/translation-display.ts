export const COMPACT_TRANSLATION_LIMIT = 140;
const COMPACT_TRANSLATION_PREVIEW_LIMIT = 105;

export function compactText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

export function isCompactText(text: string) {
  return compactText(text).length <= COMPACT_TRANSLATION_LIMIT;
}

export function shouldShowCompactTranslation(translatedText: string) {
  return isCompactText(translatedText);
}

export function previewText(text: string) {
  const compactTranslation = compactText(text);
  if (compactTranslation.length <= COMPACT_TRANSLATION_PREVIEW_LIMIT) {
    return compactTranslation;
  }

  return `${compactTranslation.slice(0, COMPACT_TRANSLATION_PREVIEW_LIMIT - 1)}...`;
}
