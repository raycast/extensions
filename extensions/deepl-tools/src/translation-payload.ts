export const TRANSLATION_STORAGE_KEY_PREFIX = "translate-text:";

export type CompletedTranslation = {
  sourceText: string;
  translatedText: string;
  sourceLang?: string;
  targetLang: string;
  rule: string;
};

export type TranslationLaunchContext = CompletedTranslation | { storageKey: string };

export function createTranslationStorageKey() {
  return `${TRANSLATION_STORAGE_KEY_PREFIX}${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function isCompletedTranslation(context: TranslationLaunchContext | undefined): context is CompletedTranslation {
  return Boolean(context && "sourceText" in context && "translatedText" in context);
}

export function getTranslationStorageKey(context: TranslationLaunchContext | undefined) {
  return context && "storageKey" in context ? context.storageKey : undefined;
}

export function isTranslationStorageKey(value: string | undefined) {
  return Boolean(value?.startsWith(TRANSLATION_STORAGE_KEY_PREFIX));
}
