import { getPreferenceValues } from "@raycast/api";
import { execFile } from "child_process";
import fs from "fs";
import { promisify } from "util";
import { languages } from "./lib/languages";

const execFileAsync = promisify(execFile);
const installedLanguagesByBinary = new Map<string, Promise<Set<string> | undefined>>();

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

const getInstalledLanguages = async () => {
  const tesseractPath = getPreferenceValues<Preferences>().tesseract_path;

  if (!installedLanguagesByBinary.has(tesseractPath)) {
    installedLanguagesByBinary.set(
      tesseractPath,
      execFileAsync(tesseractPath, ["--list-langs"])
        .then(({ stdout, stderr }) => {
          const languages = new Set(
            `${stdout}\n${stderr}`
              .split(/\r?\n/)
              .map((line) => line.trim())
              .filter((line) => line && !line.startsWith("List of available languages"))
          );

          return languages.size ? languages : undefined;
        })
        .catch(() => undefined)
    );
  }

  return installedLanguagesByBinary.get(tesseractPath);
};

const isInstalledLanguage = async (lang: string) => {
  if (!isValidLanguage(lang)) {
    return false;
  }

  const installedLanguages = await getInstalledLanguages();

  return !installedLanguages || installedLanguages.has(lang);
};

const utils = {
  handleNewLines,
  isInstalledLanguage,
  isTesseractInstalled,
  isValidLanguage,
};
export default utils;
