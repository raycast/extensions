import { getPreferenceValues } from "@raycast/api";
import { titleCase as titleCaseLib } from "title-case";
import * as changeCase from "change-case";
import { swapCase as swapCaseLib } from "swap-case";

export type CaseFunction = (input: string, options?: changeCase.Options) => string;

const ALPHABETIC_REGEX = /\p{L}/u;

const isAlphabetic = (char: string) => ALPHABETIC_REGEX.test(char);

export const alternatingCase = (input: string) => {
  let alphabeticCount = 0;
  return input
    .split("")
    .map((char) => {
      if (!isAlphabetic(char)) return char;
      alphabeticCount++;
      return alphabeticCount % 2 === 1 ? char.toUpperCase() : char.toLowerCase();
    })
    .join("");
};

export const spongeCase = alternatingCase;

export const randomCase = (input: string) => {
  return input
    .split("")
    .map((char) => {
      if (!isAlphabetic(char)) return char;
      return Math.random() > 0.5 ? char.toUpperCase() : char.toLowerCase();
    })
    .join("");
};

export const swapCase: CaseFunction = (input) => swapCaseLib(input);

export const lowerCase: CaseFunction = (input, options) => {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.preservePunctuation) {
    return input.toLowerCase();
  }
  return changeCase.noCase(input, options).toLowerCase();
};

export const lowerFirst: CaseFunction = (input) => {
  const idx = input.search(ALPHABETIC_REGEX);
  if (idx === -1) return input.toLowerCase();
  return input.slice(0, idx) + input[idx].toLowerCase() + input.slice(idx + 1);
};

export const capitalCase: CaseFunction = (input, options) => {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.preservePunctuation) {
    return input.replace(/(^|[\s_-])(\p{L})/gu, (_, sep, char) => sep + char.toUpperCase());
  }
  return changeCase.capitalCase(input, options);
};

export const kebabUpperCase: CaseFunction = (input, options) => {
  return changeCase.kebabCase(input, options).toUpperCase();
};

export const sentenceCase: CaseFunction = (input) => titleCaseLib(input, { sentenceCase: true });

export const titleCase: CaseFunction = (input) => titleCaseLib(input);

export const upperCase: CaseFunction = (input, options) => {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.preservePunctuation) {
    return input.toUpperCase();
  }
  return changeCase.noCase(input, options).toUpperCase();
};

export const upperFirst: CaseFunction = (input) => {
  const idx = input.search(ALPHABETIC_REGEX);
  if (idx === -1) return input.toUpperCase();
  return input.slice(0, idx) + input[idx].toUpperCase() + input.slice(idx + 1);
};
