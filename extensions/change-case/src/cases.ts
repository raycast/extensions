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

export type { CaseFunction };
export type CaseFunctions = Record<string, CaseFunction>;

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
  "Swap Case": ["reverse"],
  "Alternating Case": ["alternating", "sponge"],
  "Constant Case": ["macro"],
};

const READABLE_CASES = new Set(["Capital Case", "Title Case", "Sentence Case"]);

function getExceptions(value: string) {
  const entries = value
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const spellings = new Map(entries.map((entry) => [entry.toLowerCase(), entry]));
  if (spellings.size === 0) return;

  const pattern = [...spellings.keys()]
    .sort((a, b) => b.length - a.length)
    .map((entry) => entry.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");
  const wordCharacter = "[\\p{L}\\p{M}\\p{N}_]";
  return {
    spellings,
    pattern: new RegExp(`(?<!${wordCharacter})(?:${pattern})(?!${wordCharacter})`, "giu"),
  };
}

export function convert(input: string, c: string) {
  const preferences = getPreferenceValues<Preferences>();
  const options = {
    prefixCharacters: preferences.prefixCharacters,
    suffixCharacters: preferences.suffixCharacters,
  };
  if (!READABLE_CASES.has(c)) return functions[c](input, options);

  const exceptions = getExceptions(preferences.exceptions);
  if (!preferences.preserveReadableCase) {
    input = input.toLowerCase();
  } else if (exceptions && c === "Capital Case") {
    // Keep change-case from splitting exception words like iPhone.
    input = input.replace(exceptions.pattern, (match) => match.toLowerCase());
  }

  const modified = functions[c](input, options);
  return exceptions
    ? modified.replace(exceptions.pattern, (match) => exceptions.spellings.get(match.toLowerCase()) ?? match)
    : modified;
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
