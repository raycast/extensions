import axios, { isAxiosError } from "axios";
import { load } from "cheerio";
import constants from "./constants";
import { Result, EntryData, Synonym, Antonym } from "./types/types";
import { currentEntryPos, getStrength, handleSpellingMistake, isValidEntryContainerId, validQuery } from "./utils";

const scraper = async (word: string) => {
  const visited: string[] = [];
  const results: Result = {
    status: "OK",
    word,
    entries: [],
  };

  try {
    if (!word) throw new Error("Invalid query");
    const res = await axios.get(constants.links.thesaurus + word);

    const $ = load(res.data);
    const isValidQuery = validQuery($);

    if (!isValidQuery) throw new Error("Could not find any entries!");

    const pos: string[] = [];

    $(constants.merriamClasses.posContainer).each((i, el) => {
      const wordClass = $(el).text().trim();
      if (wordClass) pos.push(wordClass);
    });

    const placeholderData: {
      pos: number;
      data: EntryData;
    }[] = [];

    $(constants.merriamIds.partialEntryContainer).each((index, element) => {
      // Get the ID of the current element
      const id = $(element).attr("id");
      const isValid = isValidEntryContainerId(id);

      if (!isValid || !id) return;

      if (visited.includes(id)) return;

      const currentPos = currentEntryPos(id);

      const asInWord = $("#" + id)
        .find(constants.merriamClasses.asInWordContainer)
        .first()
        .text()
        .trim();
      const definition = $("#" + id)
        .find(constants.merriamClasses.asInWordContainer)
        .siblings()
        .contents()
        .first()
        .text()
        .trim();
      const synonyms: Synonym[] = [];
      $("#" + id)
        .find(constants.merriamClasses.synonymList)
        .first()
        .find("ul")
        .children()
        .each((i, el) => {
          const color = $(el).find("[class*=color-]").first().attr("class");
          const strength = getStrength(color || "");
          const txt = $(el).text().trim();
          if (txt) {
            synonyms.push({
              word: txt,
              strength,
            });
          }
        });

      const antonyms: Antonym[] = [];

      // To make sure that only one of each antonym is added to the array, we use a map
      const antonymMap = new Map<string, string>();
      $("#" + id)
        .find(constants.merriamClasses.antonymList)
        .first()
        .find("ul")
        .find("li")
        .each((i, el) => {
          const color = $(el).find("[class*=color-]").first().attr("class");
          const strength = getStrength(color || "");
          const txt = $(el).text().trim();
          if (!txt) return;
          if (!antonymMap.has(txt)) {
            antonymMap.set(txt, txt);
            antonyms.push({
              word: txt,
              strength,
            });
          }
        });

      placeholderData.push({
        pos: currentPos,
        data: {
          asIn: asInWord,
          definition,
          synonyms,
          antonyms,
          link: constants.links.thesaurus + word + "#" + id,
        },
      });

      visited.push(id);
    });

    pos.forEach((val, i) => {
      const entries = placeholderData.filter((data) => data.pos === i + 1);
      results.entries.push({
        pos: val,
        data: entries.map((entry) => entry.data),
      });
    });

    return results;
  } catch (error) {
    if (isAxiosError(error)) {
      const $ = load(error.response?.data);
      const suggestions = handleSpellingMistake($, word);
      if (suggestions) return suggestions;
    }
    if (error instanceof Error)
      return {
        status: "ERROR",
        reason: error?.message || "Unknown error",
      } as Result;

    return {
      status: "ERROR",
    } as Result;
  }
};

export default scraper;
