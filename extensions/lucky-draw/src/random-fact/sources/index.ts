import { randomIntInclusive } from "../../shared";
import type { RandomFactSource } from "../types";
import { parseHistoryMuffinLabs, parseUselessFacts, parseWikifeeds } from "./parsers";

export const USELESS_FACTS_SOURCE: RandomFactSource = {
  buildUrl: () => "https://uselessfacts.jsph.pl/api/v2/facts/random?language=en",
  homepageUrl: "https://uselessfacts.jsph.pl/",
  id: "uselessfacts",
  name: "uselessfacts.jsph.pl",
  parse: parseUselessFacts,
};

// disabled because it's not working
// export const QUOTABLE_SOURCE: RandomFactSource = {
//   buildUrl: () => "https://api.quotable.io/quotes/random",
//   homepageUrl: "https://github.com/lukePeavey/quotable",
//   id: "quotable",
//   name: "Quotable",
//   parse: parseQuotable,
// };

export const WIKIFEEDS_SOURCE: RandomFactSource = {
  buildUrl: (date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`;
  },
  homepageUrl: "https://en.wikipedia.org/wiki/Wikipedia:On_this_day",
  id: "wikifeeds",
  name: "Wikifeeds",
  parse: parseWikifeeds,
};

export const HISTORY_MUFFINLABS_SOURCE: RandomFactSource = {
  buildUrl: (date) => {
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `https://history.muffinlabs.com/date/${month}/${day}`;
  },
  homepageUrl: "https://history.muffinlabs.com/",
  id: "history-muffinlabs",
  name: "History Muffin Labs",
  parse: parseHistoryMuffinLabs,
};

export const RANDOM_FACT_SOURCES = [
  USELESS_FACTS_SOURCE,
  //QUOTABLE_SOURCE, // disabled because it's not working
  WIKIFEEDS_SOURCE,
  HISTORY_MUFFINLABS_SOURCE,
] as const;

export function pickRandomFactSource(random = Math.random): RandomFactSource {
  const source = RANDOM_FACT_SOURCES[randomIntInclusive(0, RANDOM_FACT_SOURCES.length - 1, random)];

  if (!source) {
    throw new Error("Random fact source selection failed.");
  }

  return source;
}
