export interface Preferences {
  primaryLanguage: string;
  languageCorrection: string;
  ocrMode: string;
  ignoreLineBreaks: boolean;
  customWordsList: string;
}

export type Language = {
  title: string;
  value: string;
  isDefault?: boolean;
};
