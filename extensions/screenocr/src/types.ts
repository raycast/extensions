export interface Preferences {
  primaryLanguage: string;
  languageCorrection: boolean;
  ocrMode: string;
  ignoreLineBreaks: boolean;
  keepImage: boolean;
  customWordsList: string;
  playSound: boolean;
  showToast: boolean;
}

export type Language = {
  title: string;
  value: string;
  isDefault?: boolean;
};
