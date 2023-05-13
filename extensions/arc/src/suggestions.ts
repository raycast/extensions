import { useFetch } from "@raycast/utils";
import { decode } from "iconv-lite";
import { nanoid } from "nanoid";
import { Suggestion, SearchConfigs } from "./types";
import { searchArcPreferences } from "./preferences";

const config: SearchConfigs = {
  google: {
    search: "https://www.google.com/search?q=",
    suggestions: "https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=",
    suggestionParser: (json: any, suggestions: Suggestion[]) => {
      json[1].map((item: string, i: number) => {
        const type = json[4]["google:suggesttype"][i];
        const description = json[2][i];
    
        if (type === "NAVIGATION") {
          suggestions.push({
            id: nanoid(),
            query: description || item,
            url: item,
          });
        } else if (type === "QUERY") {
          suggestions.push({
            id: nanoid(),
            query: item,
            url: `https://www.google.com/search?q=${encodeURIComponent(item)}`,
          });
        } else {
          console.warn("Unknown suggestion type", type, item, description);
        }
      });
    }
  },
  duckduckgo: {
    search: "https://www.duckduckgo.com?q=",
    suggestions: null, //Note: https://stackoverflow.com/questions/37012469/duckduckgo-api-getting-search-results
    suggestionParser: () => {}
  },
  bing: {
    search: "https://www.bing.com/search?q=",
    suggestions: null, //Note: Behind an API
    suggestionParser: () => {} 
  },
  yahoo: {
    search: "https://search.yahoo.com/search?p=",
    suggestions: null, //Note: Unknown
    suggestionParser: () => {}
  },
  neeva: {
    search: "https://neeva.com/search?q=",
    suggestions: null, //Note: Unknown
    suggestionParser: () => {}
  },
  ecosia: {
    search: "https://www.ecosia.org/search?q=",
    suggestions: "https://ac.ecosia.org?type=list&q=",
    suggestionParser: (json: any, suggestions: Suggestion[]) => {
      json[1].map((item: string, i: number) => {
        suggestions.push({
          id: nanoid(),
          query: item,
          url: `https://www.ecosia.org/search?q=${encodeURIComponent(item)}`,
        });
      });
    }
  }
};

async function parseResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`${response.statusText} (HTTP ${response.status})`);
  }

  const { suggestionParser } = config[searchArcPreferences.engine];
  const buffer = await response.arrayBuffer();
  const text = decode(Buffer.from(buffer), "iso-8859-1");
  const json = JSON.parse(text);

  const suggestions = new Array<Suggestion>();

  suggestionParser(json, suggestions)

  return suggestions;
}

function getDefaultSuggestion(searchText?: string) {
  return searchText
    ? {
        id: nanoid(),
        query: searchText,
        url: `${config[searchArcPreferences.engine].search}${encodeURIComponent(searchText)}`,
      }
    : undefined;
}

export function useSuggestions(searchText: string) {
  const suggestionUrl = config[searchArcPreferences.engine].suggestions;
  const defaultSuggestion = getDefaultSuggestion(searchText);

  if (suggestionUrl) {
    const response = useFetch(
      `${suggestionUrl}${encodeURIComponent(searchText)}`,
      {
        headers: {
          "Content-Type": "text/plain; charset=UTF-8",
        },
        parseResponse,
      }
    );


    if (defaultSuggestion) {
      response.data = [defaultSuggestion, ...(response.data || [])];
    }
  
    return response;
  }


  return {
    isLoading: false,
    data: defaultSuggestion ? [defaultSuggestion] : undefined
  };
}
