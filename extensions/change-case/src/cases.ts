import * as changeCase from "change-case";
import {
  lowerCase,
  lowerFirst,
  kebabUpperCase,
  upperCase,
  upperFirst,
  titleCase,
  spongeCase,
  swapCase,
  sentenceCase,
} from "./customCases";
import { getPreferenceValues } from "@raycast/api";

export type CaseFunction = (input: string, options?: changeCase.Options) => string;
export type CaseFunctions = Record<string, CaseFunction>;

export const functions: CaseFunctions = {
  "Camel Case": changeCase.camelCase,
  "Capital Case": changeCase.capitalCase,
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

export const aliases: Record<CaseType, string[]> = {
  "Header Case": ["train", "dash"],
  "No Case": ["none"],
  "Kebab Case": ["dash", "slug", "param"],
  "Random Case": ["sponge"],
  "Swap Case": ["reverse"],
  "Constant Case": ["macro"],
};

function preLowercaseText(input: string, preserveCase: boolean) {
  if (!preserveCase) {
    return input.toLowerCase();
  }
  return input;
}

export function convert(input: string, c: string) {
  const preferences = getPreferenceValues<Preferences>();

  const modified = functions[c](preLowercaseText(input, preferences.preserveCase), {
    prefixCharacters: preferences.prefixCharacters,
    suffixCharacters: preferences.suffixCharacters,
  });

  return modified;
}

export function modifyCasesWrapper(input: string, c: string) {
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
