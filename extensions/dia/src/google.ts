import { useFetch } from "@raycast/utils";
import { nanoid } from "nanoid";

export type Suggestion = {
  id: string;
  query: string;
  url: string;
};

type GoogleSuggestionParser = [
  string,
  string[],
  string[],
  string[],
  {
    "google:clientdata": {
      bpc: boolean;
      tlw: boolean;
    };
    "google:suggesttype": string[];
    "google:verbatimrelevance": number;
  },
];

export function useGoogleSuggestions(searchText: string) {
  return useFetch<Suggestion[]>(
    `https://suggestqueries.google.com/complete/search?hl=en-us&output=chrome&q=${encodeURIComponent(searchText)}`,
    {
      headers: {
        "Content-Type": "text/plain; charset=UTF-8",
      },
      execute: !!searchText,
      keepPreviousData: true,
      parseResponse: async (response) => {
        try {
          const json = (await response.json()) as GoogleSuggestionParser;

          // Validate the response structure
          if (!Array.isArray(json) || json.length < 5 || !Array.isArray(json[1]) || !json[4]) {
            console.warn("Invalid Google suggestions response structure");
            return [
              {
                id: nanoid(),
                query: searchText,
                url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
              },
            ];
          }

          const suggestions: Suggestion[] = [
            // Always add the search text as the first suggestion
            {
              id: nanoid(),
              query: searchText,
              url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
            },
          ];

          json[1].forEach((item: string, i: number) => {
            if (!item) return; // Skip empty items

            const type = json[4]["google:suggesttype"]?.[i];
            const description = json[2]?.[i];

            // Skip if the suggestion is the same as the search text
            if (item.toLowerCase() === searchText.toLowerCase()) {
              return;
            }

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
            }
          });

          return suggestions;
        } catch (error) {
          console.error("Error parsing Google suggestions:", error);
          // Return at least the search text as a fallback
          return [
            {
              id: nanoid(),
              query: searchText,
              url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
            },
          ];
        }
      },
    },
  );
}
