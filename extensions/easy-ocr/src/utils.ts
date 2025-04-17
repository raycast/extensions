import { getPreferenceValues } from "@raycast/api";
import fs from "fs";
import { languages } from "./lib/languages";

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

const isTesseractInstalled = async () => {
  return fs.existsSync(getPreferenceValues<Preferences>().tesseract_path);
};

const isValidLanguage = (lang: string) => {
  return lang in languages;
};

const utils = {
  handleNewLines,
  isTesseractInstalled,
  isValidLanguage,
};
export default utils;
