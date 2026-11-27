export type LanguageOption = {
  value: string;
  title: string;
};

export const ANY_LANGUAGE = "";

const LANGUAGE_CODES = [
  "ar",
  "bn",
  "eu",
  "bg",
  "ca",
  "hr",
  "cs",
  "da",
  "nl",
  "en",
  "fi",
  "fr",
  "de",
  "el",
  "gu",
  "he",
  "hi",
  "hu",
  "id",
  "ga",
  "it",
  "ja",
  "kn",
  "ko",
  "mr",
  "no",
  "fa",
  "pl",
  "pt",
  "ro",
  "ru",
  "sr",
  "zh",
  "sk",
  "es",
  "sv",
  "ta",
  "th",
  "tr",
  "uk",
  "ur",
  "vi",
] as const;

const englishLanguageNames = new Intl.DisplayNames(["en"], { type: "language" });

function byEnglishTitle(left: LanguageOption, right: LanguageOption): number {
  return left.title.localeCompare(right.title, "en");
}

const languagesByEnglishTitle = LANGUAGE_CODES.map((code) => ({
  value: code,
  title: englishLanguageNames.of(code) ?? code,
})).sort(byEnglishTitle);

export const LANGUAGE_OPTIONS: readonly LanguageOption[] = [
  { value: ANY_LANGUAGE, title: "Any language" },
  ...languagesByEnglishTitle,
];
