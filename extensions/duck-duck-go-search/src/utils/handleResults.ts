import { getPreferenceValues, LocalStorage } from "@raycast/api";
import { nanoid } from "nanoid";
import { Preferences, SearchResult } from "./types";
import fetch from "node-fetch";

const BANGS: Record<string, { name: string; url: string }> = {
  g: { name: "Google", url: "https://google.com/search?q=" },
  gi: { name: "Google Images", url: "https://www.google.com/search?q=" },
  yt: { name: "YouTube", url: "https://www.youtube.com/results?search_query=" },
  w: { name: "Wikipedia", url: "https://en.wikipedia.org/wiki/" },
  wde: { name: "Wikipedia (DE)", url: "https://de.wikipedia.org/wiki/" },
  imdb: { name: "IMDB", url: "https://www.imdb.com/find?q=" },
  a: { name: "Amazon.com", url: "https://www.amazon.com/s/?field-keywords=" },
  ade: { name: "Amazon.de", url: "https://www.amazon.de/s/?field-keywords=" },
  e: { name: "eBay", url: "https://www.ebay.com/sch/i.html?_nkw=" },
  ede: { name: "ebay.de", url: "https://www.ebay.de/sch/i.html?_nkw=" },
  so: { name: "Stack Overflow", url: "https://stackoverflow.com/search?q=" },
  gh: { name: "GitHub", url: "https://github.com/search?q=" },
  zillow: { name: "Zillow", url: "https://www.zillow.com/homes/" },
  t: { name: "Twitter", url: "https://twitter.com/search?q=" },
  r: { name: "Reddit", url: "https://www.reddit.com/search?q=" },
  nf: { name: "Netflix", url: "https://www.netflix.com/search?q=" },
  y: { name: "Yahoo", url: "https://search.yahoo.com/search?p=" },
  b: { name: "Bing", url: "https://www.bing.com/search?q=" },
  gif: { name: "Giphy", url: "https://giphy.com/search/" },
  wp: { name: "WordPress", url: "https://wordpress.org/search/" },
  mdn: { name: "MDN Web Docs", url: "https://developer.mozilla.org/search?q=" },
  npm: { name: "npm", url: "https://www.npmjs.com/search?q=" },
  wiktionary: { name: "Wiktionary", url: "https://en.wiktionary.org/wiki/" },
  d: { name: "Dictionary.com", url: "https://www.dictionary.com/browse/" },
  ud: { name: "Urban Dictionary", url: "https://www.urbandictionary.com/define.php?term=" },
  etsy: { name: "Etsy", url: "https://www.etsy.com/search?q=" },
  ae: { name: "AliExpress", url: "https://www.aliexpress.com/wholesale?SearchText=" },
};

export async function getSearchHistory(): Promise<SearchResult[]> {
  const { rememberSearchHistory } = getPreferenceValues<Preferences>();

  if (!rememberSearchHistory) {
    return [];
  }

  const historyString = (await LocalStorage.getItem("history")) as string;

  if (historyString === undefined) {
    return [];
  }

  const items: SearchResult[] = JSON.parse(historyString);
  return items;
}

export function getStaticResult(searchText: string): SearchResult[] {
  if (!searchText) {
    return [];
  }

  let description = ""; // Default description if no prefix is found
  let url = ""; // Default URL if no prefix is found
  let bang = "";
  if (searchText.startsWith("!")) {
    const parts = searchText.split(" ");
    bang = parts[0].substring(1); // remove the "!" prefix from the bang
    if (parts.length === 1 || parts[1] === "") {
      // Only "!*" or "!* "
      if (bang in BANGS) {
        description = `Go to ${BANGS[bang].name} (open '${BANGS[bang].url
          .split("/")[2]
          .replace("www.", "")}' in Browser)`;
        url = "https://" + `${BANGS[bang].url.split("/")[2]}`;
      }
    } else {
      // "!* search_query"
      const searchQuery = parts.slice(1).join(" ");
      if (bang in BANGS) {
        description = `Search ${BANGS[bang].name} for '${searchQuery}'`;
        url = `${BANGS[bang].url}${encodeURIComponent(searchQuery)}`;
      }
    }
  }

  if (!url) {
    description = `Search DuckDuckGo for '${searchText}'`; // Default description if no prefix is found
    url = `https://duckduckgo.com/?q=${encodeURIComponent(searchText)}`;
  }

  const result: SearchResult[] = [
    {
      id: nanoid(),
      query: searchText,
      description,
      url,
    },
  ];

  return result;
}

export async function getAutoSearchResults(searchText: string, signal: any): Promise<SearchResult[]> {
  const response = await fetch(`https://duckduckgo.com/ac/?q=${encodeURIComponent(searchText)}`, {
    method: "get",
    signal: signal,
    headers: {
      "Content-Type": "application/json; charset=UTF-8",
    },
  });

  if (!response.ok) {
    return Promise.reject(response.statusText);
  }

  const json = (await response.json()) as Array<any>;

  const results: SearchResult[] = [];

  (json as Array<any>).map((item: any) => {
    let bang = "";
    const searchText = item.phrase;

    if (searchText.substring(0, 1) === "!") {
      if (
        searchText.substring(1, searchText.length).length > 2 &&
        searchText.substring(1, searchText.length).split(" ")[0] in BANGS
      ) {
        bang = searchText.substring(1, searchText.indexOf(" "));
        results.push({
          id: nanoid(),
          query: item.phrase,
          description: `Search ${BANGS[bang].name} for '${searchText.substring(searchText.indexOf(" ") + 1)}'`,
          url: `${BANGS[bang].url}${encodeURIComponent(searchText.substring(searchText.indexOf(" ") + 1))}`,
        });
      } else {
        results.push({
          id: nanoid(),
          query: item.phrase,
          description: `Search DuckDuckGo for '${searchText}'`, // Default description if no prefix is found
          url: `https://duckduckgo.com/?q=${encodeURIComponent(searchText)}`,
        });
      }
    } else {
      results.push({
        id: nanoid(),
        query: item.phrase,
        description: `Search DuckDuckGo for '${searchText}'`, // Default description if no prefix is found
        url: `https://duckduckgo.com/?q=${encodeURIComponent(searchText)}`,
      });
    }
  });

  return results;
}
