import { BookEntry } from "../types";
import { languages } from "./constants";

export const isEmpty = (string: string | null | undefined) => {
  return !(string != null && String(string).length > 0);
};

export const formatBytes = (bytes: number, decimals = 2) => {
  if (bytes === 0) return "0 Bytes";

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
};

export const parseLowerCaseArray = (string: string) => {
  return string
    .toLowerCase()
    .split(",")
    .map((item) => item.trim());
};

// https://stackoverflow.com/questions/10003683/how-can-i-extract-a-number-from-a-string-in-javascript
export const extractNumber = (string: string, index = 0) => {
  const numbers = string.match(/\d+/);
  return numbers ? numbers[index] : string; // replace all leading non-digits with nothing
};

export const sortBooksByPreferredLanguages = (books: BookEntry[], preferredLanguages: string) => {
  // parse the languages to a list in lower case
  const preferredLanguageList = parseLowerCaseArray(preferredLanguages);

  // keep only accept languages that are in the list of supported languages
  const filteredPreferredLanguageList = preferredLanguageList.filter((pl) =>
    languages.map((l) => l.name.toLowerCase()).includes(pl)
  );

  // generate a weight table based on the order of languages
  const languageWeights: { [language: string]: number } = {};
  filteredPreferredLanguageList.forEach((pl, i) => {
    languageWeights[pl] = filteredPreferredLanguageList.length - i;
  });

  // sort books based on the language weight
  books.sort((a, b) => {
    // some books contains more than one languages in the attribute
    const languagesA = parseLowerCaseArray(a.language);
    // add up weights for all languages
    const weightA = languagesA.map((l) => (l in languageWeights ? languageWeights[l] : 0)).reduce((p, c) => p + c, 0);

    const languagesB = parseLowerCaseArray(b.language);
    const weightB = languagesB.map((l) => (l in languageWeights ? languageWeights[l] : 0)).reduce((p, c) => p + c, 0);

    return weightB - weightA;
  });

  return books;
};

export const sortBooksByPreferredFileFormats = (books: BookEntry[], preferredFormats: string) => {
  // parse the formats to a list in lower case
  const preferredFormatList = parseLowerCaseArray(preferredFormats);
  // generate a weight table based on the order of formats
  const formatWeights: { [format: string]: number } = {};
  preferredFormatList.forEach((pf, i) => {
    formatWeights[pf] = preferredFormatList.length - i;
  });

  // sort books based on the format weight
  books.sort((a, b) => {
    // https://stackoverflow.com/questions/20864893/replace-all-non-alphanumeric-characters-new-lines-and-multiple-white-space-wit
    // clean up the file format string
    const extensionA = a.extension.replace(/[\W_]+/g, "");
    const weightA = extensionA in formatWeights ? formatWeights[extensionA] : 0;

    const extensionB = b.extension.replace(/[\W_]+/g, "");
    const weightB = extensionB in formatWeights ? formatWeights[extensionB] : 0;

    return weightB - weightA;
  });

  return books;
};
