import { useFetch } from "@raycast/utils";
import { decode } from "iconv-lite";
import { nanoid } from "nanoid";
import { Suggestion } from "./types";

async function parseResponse(response: Response) {
  if (!response.ok) {
    throw new Error(`${response.statusText} (HTTP ${response.status})`);
  }

  const buffer = await response.arrayBuffer();
  const text = decode(Buffer.from(buffer), "iso-8859-1");
  const json = JSON.parse(text);

  const suggestions = new Array<Suggestion>();

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

  return suggestions;
}

function getDefaultSuggestion(searchText?: string) {
  return searchText
    ? {
        id: nanoid(),
        query: searchText,
        url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
      }
    : undefined;
}

export function useSuggestions(searchText: string) {
  const response = useFetch(
    `https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=${encodeURIComponent(searchText)}`,
    {
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
      },
      parseResponse,
    }
  );

  const defaultSuggestion = getDefaultSuggestion(searchText);
  if (defaultSuggestion) {
    response.data = [defaultSuggestion, ...(response.data || [])];
  }

  return response;
}
