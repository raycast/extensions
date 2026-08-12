import * as changeCase from "change-case";
import {
  CaseFunction,
  capitalCase,
  lowerCase,
  lowerFirst,
  kebabUpperCase,
  upperCase,
  upperFirst,
  titleCase,
  alternatingCase,
  randomCase,
  swapCase,
  sentenceCase,
} from "./customCases";
import { getPreferenceValues } from "@raycast/api";
import { scrambleText } from "./scramble-text";

export type { CaseFunction };
export type CaseFunctions = Record<string, CaseFunction>;

const scrambleCase: CaseFunction = (input) => {
  const preferences = getPreferenceValues<Preferences>();
  return scrambleText(input, { scrambleNumbers: preferences.scrambleNumbers });
};

export const functions: CaseFunctions = {
  "Camel Case": changeCase.camelCase,
  "Capital Case": capitalCase,
  "Constant Case": changeCase.constantCase,
  "Dot Case": changeCase.dotCase,
  "Header Case": changeCase.trainCase,
  "Lower Case": lowerCase,
  "Lower First": lowerFirst,
  "No Case": changeCase.noCase,
  "Kebab Case": changeCase.kebabCase,
  "Kebab Upper Case": kebabUpperCase,
  "Pascal Case": changeCase.pascalCase,
  "Pascal Snake Case": changeCase.pascalSnakeCase,
  "Path Case": changeCase.pathCase,
  "Random Case": randomCase,
  "Scramble Text": scrambleCase,
  "Sentence Case": sentenceCase,
  "Snake Case": changeCase.snakeCase,
  "Alternating Case": alternatingCase,
  "Swap Case": swapCase,
  "Title Case": titleCase,
  "Upper Case": upperCase,
  "Upper First": upperFirst,
};

export const cases = Object.keys(functions);
export type CaseType = (typeof cases)[number];

export const aliases: Record<CaseType, string[]> = {
  "Header Case": ["train", "dash"],
  "No Case": ["none"],
  "Kebab Case": ["dash", "slug", "param"],
  "Random Case": ["random"],
  "Scramble Text": ["scramble", "greeking", "placeholder", "anonymize", "draft"],
  "Swap Case": ["reverse"],
  "Alternating Case": ["alternating", "sponge"],
  "Constant Case": ["macro"],
};

// cases that must not be pre-lowercased, as they depend on the original casing
const CASES_SKIP_PRELOWERCASE: Set<string> = new Set([
  "Swap Case", // pre-lowercasing would make output all-uppercase
  "Alternating Case", // alternates per character from original positions
  "Random Case", // no point in pre-lowercasing, as output is random anyway
  "Scramble Text", // original casing is part of the visual layout contract
  "Lower First", // only first letter should be changed
  "Upper First", // only first letter should be changed
]);

function preLowercaseText(input: string, preserveCase: boolean) {
  if (!preserveCase) {
    return input.toLowerCase();
  }
  return input;
}

export function convert(input: string, c: string) {
  const preferences = getPreferenceValues<Preferences>();
  const preserveCase = preferences.preserveCase || CASES_SKIP_PRELOWERCASE.has(c);

  const modified = functions[c](preLowercaseText(input, preserveCase), {
    prefixCharacters: preferences.prefixCharacters,
    suffixCharacters: preferences.suffixCharacters,
  });

  return modified;
}

export function modifyCasesWrapper(input: string, c: string) {
  if (c === "Scramble Text") {
    const modified = convert(input, c);
    const markdown = modified
      .split("\n")
      .map((line) => (line.length === 0 ? "\u200B" : line) + "\n")
      .join("");

    return { rawText: modified, markdown };
  }

  const modifiedRawArr: string[] = [];
  const modifiedMarkdownArr: string[] = [];
  const lines = input.split("\n");

  for (const line of lines) {
    const modified = convert(line, c);

    modifiedRawArr.push(modified);
    modifiedMarkdownArr.push((modified.length === 0 ? "\u200B" : modified) + "\n");
  }

  return { rawText: modifiedRawArr.join("\n"), markdown: modifiedMarkdownArr.join("\n") };
}
