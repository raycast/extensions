import type { Score } from "@zxcvbn-ts/core";
import { zxcvbn, zxcvbnOptions } from "@zxcvbn-ts/core";
import { adjacencyGraphs, dictionary } from "@zxcvbn-ts/language-common";
import * as zxcvbnEnPackage from "@zxcvbn-ts/language-en";
import fetch from "node-fetch";
import { stat, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { environment, getPreferenceValues } from "@raycast/api";

type Dictionary = {
  commonWords: string[];
  firstnames: string[];
  lastnames: string[];
  wikipedia: string[];
};

const languageUrlMap: Record<string, { url: string; version: string }> = {
  de: { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-de@3.0.2/+esm", version: "3.0.2" },
  fi: { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-fi@3.0.2/+esm", version: "3.0.2" },
  fr: { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-fr@3.0.2/+esm", version: "3.0.2" },
  id: { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-id@3.0.2/+esm", version: "3.0.2" },
  it: { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-it@3.0.2/+esm", version: "3.0.2" },
  "es-es": { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-es-es@3.0.2/+esm", version: "3.0.2" },
  ja: { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-ja@3.0.2/+esm", version: "3.0.2" },
  "nl-be": { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-nl-be@3.0.2/+esm", version: "3.0.2" },
  pl: { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-pl@3.0.2/+esm", version: "3.0.2" },
  "pt-br": { url: "https://cdn.jsdelivr.net/npm/@zxcvbn-ts/language-pt-br@3.0.2/+esm", version: "3.0.2" },
};

const commandPrefs = getPreferenceValues<Preferences.CheckPasswordStrength>();
const offlineDictionaryKeys = Object.keys(commandPrefs).filter((key) => key.startsWith("offline-dictionary-")) as Array<
  keyof Preferences.CheckPasswordStrength
>;
const enabledDictionaries = offlineDictionaryKeys
  .filter((key) => commandPrefs[key] === true)
  .map((key) => key.replace("offline-dictionary-", ""));
const offlineDictionaries = enabledDictionaries.length ? enabledDictionaries : ["en"];

const getLanguage = async (lang: keyof typeof languageUrlMap) => {
  const { url, version } = languageUrlMap[lang];

  const fileName = `language-${lang}-${version}.mjs`;
  const filePath = resolve(environment.supportPath, fileName);

  let exists = false;
  try {
    await stat(filePath);
    exists = true;
  } catch (error) {
    exists = false;
  }

  if (exists) {
    return import(`file://${filePath}`).then((module: { dictionary: Dictionary }) => {
      return { lang, version, module };
    });
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch language file: ${response.statusText}`);
  }

  const code = await response.text();
  await writeFile(filePath, code);

  return import(`file://${filePath}`).then((module: { dictionary: Dictionary }) => {
    return { lang, version, module };
  });
};

export const checkPasswordStrength = async (password: string) => {
  const useEnglish = offlineDictionaries.includes("en");
  const otherLanguages = offlineDictionaries.filter((lang) => lang !== "en");

  const dictionaries = await Promise.all(otherLanguages.map((lang) => getLanguage(lang)));

  const usedDictionaries: Dictionary = {
    commonWords: [
      ...dictionaries.reduce<string[]>((acc, { module }) => acc.concat(module.dictionary?.commonWords || []), []),
      ...(useEnglish ? zxcvbnEnPackage.dictionary.commonWords : []),
    ],
    firstnames: [
      ...dictionaries.reduce<string[]>((acc, { module }) => acc.concat(module.dictionary?.firstnames || []), []),
      ...(useEnglish ? zxcvbnEnPackage.dictionary.firstnames : []),
    ],
    lastnames: [
      ...dictionaries.reduce<string[]>((acc, { module }) => acc.concat(module.dictionary?.lastnames || []), []),
      ...(useEnglish ? zxcvbnEnPackage.dictionary.lastnames : []),
    ],
    wikipedia: [
      ...dictionaries.reduce<string[]>((acc, { module }) => acc.concat(module.dictionary?.wikipedia || []), []),
      ...(useEnglish ? zxcvbnEnPackage.dictionary.wikipedia : []),
    ],
  };

  const options = {
    translations: zxcvbnEnPackage.translations,
    graphs: adjacencyGraphs,
    dictionary: {
      ...dictionary,
      ...usedDictionaries,
    },
  };

  zxcvbnOptions.setOptions(options);

  return {
    strength: zxcvbn(password),
    dictionaries: dictionaries
      .map(({ lang, version }) => ({ lang, version }))
      .concat(useEnglish ? [{ lang: "en", version: "" }] : []),
  };
};

export const scoreToText = (score: Score) => {
  switch (score) {
    case 0:
      return `${score} - Too Guessable`;
    case 1:
      return `${score} - Very Guessable`;
    case 2:
      return `${score} - Somewhat Guessable`;
    case 3:
      return `${score} - Safely Unguessable`;
    case 4:
      return `${score} - Very Unguessable`;
    default:
      return "Unknown";
  }
};
