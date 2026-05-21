import { getPreferenceValues } from "@raycast/api";
import util from "util";
import { execFile } from "child_process";
import utils from "./utils";

const execFilePromise = util.promisify(execFile);

export default async function tesseractOcr(imagePath: string, lang: string) {
  /**
   * If passed language doesn't exist in Tesseract use default language.
   * This is mandatory because we're passing detected language from external library
   */
  if (!utils.isValidLanguage(lang)) {
    lang = getPreferenceValues<Preferences>().tesseract_lang;
  }

  const preferences = getPreferenceValues<Preferences>();
  const tesseractBinary = preferences.tesseract_path || "tesseract";
  const psm = preferences.tesseract_psm || "6";
  const { stdout } = await execFilePromise(
    tesseractBinary,
    [imagePath, "stdout", "-l", lang, "--oem", "1", "--psm", psm, "-c", "preserve_interword_spaces=1"],
    {
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    }
  );

  return stdout;
}
