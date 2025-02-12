export interface LanguageOption {
  value: string;
  title: string;
}

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { value: "auto", title: "Keep the same language as the input" },
  { value: "en", title: "English" },
  { value: "fr", title: "French" },
  { value: "es", title: "Spanish" },
  { value: "de", title: "German" },
  { value: "it", title: "Italian" },
  { value: "pt", title: "Portuguese" },
  { value: "nl", title: "Dutch" },
  { value: "ru", title: "Russian" },
  { value: "zh", title: "Chinese" },
  { value: "ja", title: "Japanese" },
  { value: "ko", title: "Korean" },
];
