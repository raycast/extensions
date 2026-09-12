import { CheerioAPI } from "cheerio";
import constants from "./constants";
import { Result } from "./types/types";

/**
 * Checks for entries ('[id^="thesaurus-entry-"]') and return true if the id is valid
 *
 * @example
 * const id = "thesaurus-entry-1-about"
 * isValidEntryContainerId(id) // false
 *
 * const anotherId = "thesaurus-entry-1-1"
 * isValidEntryContainerId(anotherId) // true
 *
 *
 * @param id string | undefined
 * @returns boolean
 */
export const isValidEntryContainerId = (id: string | undefined) => {
  if (!id) return false;
  const split = id.split("-");

  if (split.length > 4) return false;
  if (split[0] !== "thesaurus" || split[1] !== "entry") return false;
  if (isNaN(+split[2])) return false;
  if (isNaN(+split[3])) return false;
  return true;
};

/**
 * Returns the current position of a particular thesaurus entry. Parses the entry id and returns the number after the second hyphen.
 * @example
 * const id = "thesaurus-entry-1-2"
 * currentEntryPos(id) // 2
 * @param id string
 * @returns number
 */
export const currentEntryPos = (id: string) => {
  const split = id.split("-");
  return +split[2];
};

/**
 * Checks if the html returned by the request is valid by checking if there are any entry container ids
 * @param $ CheerioAPI
 * @returns boolean
 */
export const validQuery = ($: CheerioAPI) => {
  const pos = $(constants.merriamIds.partialEntryContainer);
  return pos.length > 0;
};

/**
 * If the user misspelled a word, the html will contain a div with the class spelling-suggestions. This function will check if the div exists and return the suggestions.
 * @param $ CheerioAPI
 * @param term string
 * @returns undefined | Result with status NOT_FOUND and suggestions
 */
export const handleSpellingMistake = ($: CheerioAPI, term: string) => {
  const suggestions = $(".spelling-suggestions");
  if (suggestions.length === 0) return;
  const result: Result = {
    status: "NOT_FOUND",
    suggestions: [],
  };
  suggestions.each((i, el) => {
    const suggestion = $(el).text().trim();

    // removing the search term from the suggestions
    const isSameAsTerm = suggestion.toLowerCase() === term.trim().toLowerCase();
    if (suggestion && !isSameAsTerm) result.suggestions.push(suggestion);
  });
  return result;
};

/**
 * Finds the number of a given string and always returns a number. If no number is found, it returns 1.
 * @param str string
 * @returns number
 */
export const getStrength = (str: string) => {
  const strength = str.match(/\d+/);
  if (strength) return +strength[0];
  return 1;
};
