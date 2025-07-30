import { getPreferenceValues } from "@raycast/api";
import { SMALL_WORDS, titleCase as titleCaseLib } from "title-case";
import * as changeCase from "change-case";
import { spongeCase as spongeCaseLib } from "sponge-case";
import { swapCase as swapCaseLib } from "swap-case";

const preferences = getPreferenceValues<Preferences>();

function isAlphabetic(char: string) {
  return /\p{L}/u.test(char);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const spongeCase = (input: string, _options?: changeCase.Options) => spongeCaseLib(input);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const swapCase = (input: string, _options?: changeCase.Options) => swapCaseLib(input);

export const lowerCase = (input: string, options?: changeCase.Options) => {
  if (preferences.preservePunctuation) {
    return input.toLowerCase();
  }
  return changeCase.noCase(input, options).toLowerCase();
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const lowerFirst = (input: string, _options?: changeCase.Options) => {
  if (input.length <= 1) {
    return input.toLowerCase();
  }

  // lowercase the first alphabetic character
  let res = "";

  for (let i = 0; i < input.length; i++) {
    if (isAlphabetic(input[i])) {
      res += input[i].toLowerCase();
      break;
    }
    res += input[i];
  }

  return res + input.slice(res.length);
};

export const kebabUpperCase = (input: string, options?: changeCase.Options) => {
  const kebabCase = changeCase.kebabCase(input, options);
  return kebabCase.toUpperCase();
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const handleSmallWordsTitleCase = (input: string, sentenceCase: boolean, _options?: changeCase.Options) => {
  const exceptions =
    getPreferenceValues<ExtensionPreferences>()
      .exceptions.split(",")
      .map((e) => e.trim()) ?? [];

  const smallWords = new Set<string>([...exceptions, ...SMALL_WORDS]);

  return titleCaseLib(input, { sentenceCase, smallWords });
};

export const sentenceCase = (input: string, options?: changeCase.Options) =>
  handleSmallWordsTitleCase(input, true, options);

export const titleCase = (input: string, options?: changeCase.Options) =>
  handleSmallWordsTitleCase(input, false, options);

export const upperCase = (input: string, options?: changeCase.Options) => {
  if (preferences.preservePunctuation) {
    return input.toUpperCase();
  }
  return changeCase.noCase(input, options).toUpperCase();
};

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const upperFirst = (input: string, _options?: changeCase.Options) => {
  if (input.length <= 1) {
    return input.toUpperCase();
  }

  // uppercase the first alphabetic character
  let res = "";

  for (let i = 0; i < input.length; i++) {
    if (isAlphabetic(input[i])) {
      res += input[i].toUpperCase();
      break;
    }
    res += input[i];
  }

  return res + input.slice(res.length);
};
