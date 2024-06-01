import { getPreferenceValues } from "@raycast/api";
import * as changeCase from "change-case";
import { spongeCase } from "sponge-case";
import { swapCase } from "swap-case";
import { SMALL_WORDS, titleCase as titleCaseLib } from "title-case";

export type CaseFunction = (input: string) => string;
export type CaseFunctions = Record<string, CaseFunction>;

const lowerCase = (input: string) => input.toLowerCase();

const lowerFirst = (input: string) => {
  if (input.length <= 1) {
    return input.toLowerCase();
  }
  return input[0].toLowerCase() + input.slice(1);
};

const sentenceCase = (input: string) => {
  const smallWordsPrefs = getPreferenceValues<ExtensionPreferences>().smallWords?.split(',') ?? [];
  const smallWords = new Set<string>([...smallWordsPrefs, ...SMALL_WORDS]);
  return titleCaseLib(input, { sentenceCase: true, smallWords });
}

const titleCase = (input: string) => {
  const smallWordsPrefs = getPreferenceValues<ExtensionPreferences>().smallWords?.split(',') ?? [];
  const smallWords = new Set<string>([...smallWordsPrefs, ...SMALL_WORDS]);
  return titleCaseLib(input, { smallWords });
}

const upperCase = (input: string) => input.toUpperCase();

const upperFirst = (input: string) => {
  if (input.length <= 1) {
    return input.toUpperCase();
  }
  return input[0].toUpperCase() + input.slice(1);
};

export const functions: CaseFunctions = {
  "Camel Case": changeCase.camelCase,
  "Capital Case": changeCase.capitalCase,
  "Constant Case": changeCase.constantCase,
  "Dot Case": changeCase.dotCase,
  "Header Case": changeCase.trainCase,
  "Lower Case": lowerCase,
  "Lower First": lowerFirst,
  "No Case": changeCase.noCase,
  "Param Case": changeCase.kebabCase,
  "Pascal Case": changeCase.pascalCase,
  "Pascal Snake Case": changeCase.pascalSnakeCase,
  "Path Case": changeCase.pathCase,
  "Random Case": spongeCase,
  "Sentence Case": sentenceCase,
  "Snake Case": changeCase.snakeCase,
  "Swap Case": swapCase,
  "Title Case": titleCase,
  "Upper Case": upperCase,
  "Upper First": upperFirst,
};

export const cases = Object.keys(functions);
export type CaseType = (typeof cases)[number];
