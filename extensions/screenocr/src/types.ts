export interface Preferences {
  primaryLanguage: string;
  languageCorrection: string;
  ocrMode: string;
}

export type Language = {
  title: string;
  value: string;
  isDefault?: boolean;
};
