import * as changeCase from "change-case";
import { spongeCase } from "sponge-case";
import { swapCase } from "swap-case";
import { titleCase } from "title-case";

export type CaseFunction = (input: string) => string;
export type CaseFunctions = Record<string, CaseFunction>;

const lowerCase = (input: string) => input.toLowerCase();

const lowerFirst = (input: string) => {
  if (input.length <= 1) {
    return input.toLowerCase();
  }
  return input[0].toLowerCase() + input.slice(1);
};

const sentenceCase = (input: string) => titleCase(input, { sentenceCase: true });

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
  "Header Case": changeCase.trainCase, // see Train Case
  "Kebab Case": changeCase.kebabCase,
  "Lower Case": lowerCase,
  "Lower First": lowerFirst,
  "Macro Case": changeCase.constantCase, // see Constant Case
  "No Case": changeCase.noCase,
  "Param Case": changeCase.kebabCase, // see Kebab Case
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
  "Sponge Case": spongeCase, // see Random Case
  "Train Case": changeCase.trainCase,
};

export const cases = Object.keys(functions);
export type CaseType = (typeof cases)[number];
