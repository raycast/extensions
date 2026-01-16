import { getPreferenceValues } from "@raycast/api";
import { SMALL_WORDS, titleCase as titleCaseLib } from "title-case";
import * as changeCase from "change-case";
import { spongeCase as spongeCaseLib } from "sponge-case";
import { swapCase as swapCaseLib } from "swap-case";

export type CaseFunction = (input: string, options?: changeCase.Options) => string;

const ALPHABETIC_REGEX = /\p{L}/u;

export const spongeCase: CaseFunction = (input) => spongeCaseLib(input);

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

// Note: We intentionally do NOT pre-lowercase the input here.
// The change-case library author explicitly chose not to pre-lowercase because:
// 1. Words like "iPhone" and "NASA" would become "iphone" and "nasa"
// 2. Context-aware conversions (e.g., "hereAreSomeWords" → "Here Are Some Words") would break
// See: https://github.com/blakeembrey/change-case/issues/308
export const capitalCase: CaseFunction = (input, options) => {
  const preferences = getPreferenceValues<Preferences>();
  if (preferences.preservePunctuation) {
    return input.replace(/(^|[\s\-_])(\w)/g, (_, sep, char) => sep + char.toUpperCase());
  }
  return changeCase.capitalCase(input, options);
};

export const kebabUpperCase: CaseFunction = (input, options) => {
  return changeCase.kebabCase(input, options).toUpperCase();
};

const handleSmallWordsTitleCase = (input: string, isSentenceCase: boolean): string => {
  const exceptions =
    getPreferenceValues<ExtensionPreferences>()
      .exceptions.split(",")
      .map((e) => e.trim()) ?? [];

  const smallWords = new Set<string>([...exceptions, ...SMALL_WORDS]);

  return titleCaseLib(input, { sentenceCase: isSentenceCase, smallWords });
};

export const sentenceCase: CaseFunction = (input) => handleSmallWordsTitleCase(input, true);

export const titleCase: CaseFunction = (input) => handleSmallWordsTitleCase(input, false);

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
