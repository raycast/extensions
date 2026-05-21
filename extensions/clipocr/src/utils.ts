import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import util from "util";
import { execFile } from "child_process";
import { languages } from "./lib/languages";
import { normalizeChinesePunctuationText } from "./text";
import type { Preferences } from "./preferences";

const execFilePromise = util.promisify(execFile);

function handleNewLines(text: string) {
  const newLine = getPreferenceValues<Preferences>().newLine;

  if (newLine === "replaceSpace") {
    return text.replace(/\n/g, " ");
  }
  if (newLine === "replaceBreak") {
    return text.replace(/\n/g, "<br>");
  }

  return text;
}

function normalizeChinesePunctuation(text: string) {
  if (!getPreferenceValues<Preferences>().chinesePunctuation) {
    return text;
  }

  return normalizeChinesePunctuationText(text);
}

const isTesseractInstalled = async () => {
  const tesseractPath = getPreferenceValues<Preferences>().tesseract_path || "tesseract";

  if (fs.existsSync(tesseractPath)) {
    return true;
  }

  try {
    const command = process.platform === "win32" ? "where.exe" : "which";
    await execFilePromise(command, [tesseractPath]);
    return true;
  } catch {
    return false;
  }
};

const isValidLanguage = (lang: string) => {
  const languageCodes = lang
    .toLowerCase()
    .split("+")
    .map((languageCode) => languageCode.trim())
    .filter(Boolean);

  return languageCodes.length > 0 && languageCodes.every((languageCode) => languageCode in languages);
};

const utils = {
  handleNewLines,
  isTesseractInstalled,
  isValidLanguage,
  normalizeChinesePunctuation,
};
export default utils;
