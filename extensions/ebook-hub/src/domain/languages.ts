export const UNKNOWN_LANGUAGE = "und";

export const LANGUAGE_OPTIONS: readonly { code: string; label: string }[] = [
  { code: "vi", label: "Vietnamese" },
  { code: "en", label: "English" },
  { code: "zh", label: "Chinese" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "es", label: "Spanish" },
  { code: "ru", label: "Russian" },
  { code: UNKNOWN_LANGUAGE, label: "Unknown" },
];

/** Reduce a BCP 47 tag such as `en-US` to its primary subtag (`en`). */
export function normalizeLanguageTag(tag: string | null | undefined): string {
  const primary = (tag ?? "").trim().toLowerCase().split(/[-_]/)[0];
  return /^[a-z]{2,3}$/.test(primary) ? primary : UNKNOWN_LANGUAGE;
}

export function languageLabel(code: string): string {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? code.toUpperCase();
}
