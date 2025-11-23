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
        const json: GoogleSuggestionParser = await response.json();

        const suggestions: Suggestion[] = [
          // Always add the search text as the first suggestion
          {
            id: nanoid(),
            query: searchText,
            url: `https://www.google.com/search?q=${encodeURIComponent(searchText)}`,
          },
        ];

        json[1].forEach((item: string, i: number) => {
          const type = json[4]["google:suggesttype"][i];
          const description = json[2][i];

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
      },
    },
  );
}
