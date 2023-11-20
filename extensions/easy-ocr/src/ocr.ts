import { recognize } from "node-tesseract-ocr";
import { getPreferenceValues } from "@raycast/api";

export default async function tesseractOcr(imagePath: string) {
  const config = {
    lang: getPreferenceValues<Preferences>().tesseract_lang,
    oem: 1,
    psm: 3,
    binary: getPreferenceValues<Preferences>().tesseract_path,
  };

  return await recognize(imagePath, config);
}
