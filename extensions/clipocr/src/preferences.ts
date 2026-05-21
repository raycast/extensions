export type Preferences = {
  tesseract_path?: string;
  autodetect_lang: boolean;
  tesseract_lang: string;
  newLine?: "replaceSpace" | "keep" | "replaceBreak";
  tesseract_psm?: "3" | "6" | "7" | "11";
  chinesePunctuation?: boolean;
};
