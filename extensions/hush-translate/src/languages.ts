/** The languages Apple Intelligence translates between. Mirrors the list in `package.json`. */
export const LANGUAGES = [
  { code: "zh-Hans", name: "简体中文" },
  { code: "zh-Hant", name: "繁體中文" },
  { code: "en", name: "English" },
  { code: "ja", name: "日本語" },
  { code: "ko", name: "한국어" },
  { code: "fr", name: "Français" },
  { code: "de", name: "Deutsch" },
  { code: "es", name: "Español" },
  { code: "it", name: "Italiano" },
  { code: "pt", name: "Português" },
  { code: "nl", name: "Nederlands" },
  { code: "sv", name: "Svenska" },
  { code: "da", name: "Dansk" },
  { code: "nb", name: "Norsk" },
  { code: "tr", name: "Türkçe" },
  { code: "vi", name: "Tiếng Việt" },
] as const;

const displayNames = new Intl.DisplayNames(["en"], { type: "language" });

/** A readable name for any language code, including detected ones outside the list. */
export function languageName(code: string): string {
  const known = LANGUAGES.find((language) => language.code === code);
  if (known) return known.name;
  try {
    return displayNames.of(code) ?? code;
  } catch {
    return code;
  }
}
