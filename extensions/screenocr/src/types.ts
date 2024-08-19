export interface Preferences {
  primaryLanguage: string;
  languageCorrection: string;
  ocrMode: string;
  ignoreLineBreaks: boolean;
  keepImage: boolean;
  customWordsList: string;
}

export type Language = {
  title: string;
  value: string;
  isDefault?: boolean;
};
