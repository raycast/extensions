import { recognize } from "node-tesseract-ocr";
import { getPreferenceValues } from "@raycast/api";
import { languages } from "./lib/languages";

export default async function tesseractOcr(imagePath: string, lang: string) {
  /**
   * If passed language doesn't exist in Tesseract use default language.
   * This is mandatory because we're passing detected language from external library
   */
  if (!(lang in languages)) {
    lang = getPreferenceValues<Preferences>().tesseract_lang;
  }

  const config = {
    lang,
    oem: 1,
    psm: 3,
    binary: getPreferenceValues<Preferences>().tesseract_path,
  };

  return await recognize(imagePath, config);
}
