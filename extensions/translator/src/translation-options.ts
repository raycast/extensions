import { TRANSLATION_TARGETS, type TranslationTarget } from "./openai-compatible";
import { enabledLanguagePreferences, type TranslationLanguagePreferences } from "./translation-language-preferences";

export type { TranslationLanguagePreferences } from "./translation-language-preferences";

export interface TranslationOption {
  target: TranslationTarget;
  title: string;
  icon: string;
  keywords: string[];
  preference: keyof TranslationLanguagePreferences;
}

export const TRANSLATION_OPTIONS: TranslationOption[] = [
  {
    target: TRANSLATION_TARGETS.spanish,
    title: "Spanish",
    icon: "🇪🇸",
    keywords: ["espanhol", "spanish", "es"],
    preference: "showSpanish",
  },
  {
    target: TRANSLATION_TARGETS.english,
    title: "English",
    icon: "🇺🇸",
    keywords: ["inglês", "english", "en"],
    preference: "showEnglish",
  },
  {
    target: TRANSLATION_TARGETS.brazilianPortuguese,
    title: "Brazilian Portuguese",
    icon: "🇧🇷",
    keywords: ["português", "portuguese", "brasil", "pt-br"],
    preference: "showBrazilianPortuguese",
  },
  {
    target: TRANSLATION_TARGETS.french,
    title: "French",
    icon: "🇫🇷",
    keywords: ["francês", "french", "fr"],
    preference: "showFrench",
  },
  {
    target: TRANSLATION_TARGETS.german,
    title: "German",
    icon: "🇩🇪",
    keywords: ["alemão", "german", "de"],
    preference: "showGerman",
  },
  {
    target: TRANSLATION_TARGETS.italian,
    title: "Italian",
    icon: "🇮🇹",
    keywords: ["italiano", "italian", "it"],
    preference: "showItalian",
  },
  {
    target: TRANSLATION_TARGETS.japanese,
    title: "Japanese",
    icon: "🇯🇵",
    keywords: ["japonês", "japanese", "ja"],
    preference: "showJapanese",
  },
  {
    target: TRANSLATION_TARGETS.korean,
    title: "Korean",
    icon: "🇰🇷",
    keywords: ["coreano", "korean", "ko"],
    preference: "showKorean",
  },
  {
    target: TRANSLATION_TARGETS.simplifiedChinese,
    title: "Simplified Chinese",
    icon: "🇨🇳",
    keywords: ["chinês", "chinese", "simplified", "zh-cn"],
    preference: "showSimplifiedChinese",
  },
];

export function enabledTranslationOptions(preferences: TranslationLanguagePreferences): TranslationOption[] {
  const enabledPreferences = new Set(enabledLanguagePreferences(preferences));
  return TRANSLATION_OPTIONS.filter((option) => enabledPreferences.has(option.preference));
}

export function translationOptionForTargetId(
  targetId: TranslationTarget["id"] | string | undefined,
): TranslationOption | undefined {
  return TRANSLATION_OPTIONS.find((option) => option.target.id === targetId);
}

export function translationTargetTitle(target: TranslationTarget | undefined): string {
  return translationOptionForTargetId(target?.id)?.title ?? "the selected language";
}
