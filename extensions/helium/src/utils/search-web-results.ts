import type { Suggestion } from "../types";

export interface SearchWebSuggestionGroups {
  bangSuggestions: Suggestion[];
  webSuggestions: Suggestion[];
  urlSuggestions: Suggestion[];
}

export function partitionSearchWebSuggestions(suggestions: Suggestion[]): SearchWebSuggestionGroups {
  return suggestions.reduce<SearchWebSuggestionGroups>(
    (groups, suggestion) => {
      if (suggestion.type === "bang") {
        groups.bangSuggestions.push(suggestion);
      } else if (suggestion.type === "url") {
        groups.urlSuggestions.push(suggestion);
      } else {
        groups.webSuggestions.push(suggestion);
      }

      return groups;
    },
    { bangSuggestions: [], webSuggestions: [], urlSuggestions: [] },
  );
}
