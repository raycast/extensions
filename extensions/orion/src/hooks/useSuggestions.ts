import { getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { buildSuggestUrl, getSearchEngine } from "../utils";

const DEFAULT_SUGGESTION_LIMIT = 6;

function getSuggestionLimit(): number {
  const configured = Number(getPreferenceValues<Preferences>().suggestionLimit);
  return Number.isInteger(configured) && configured >= 0 && configured <= 12 ? configured : DEFAULT_SUGGESTION_LIMIT;
}

// Live search-engine autocomplete for the Command Bar. Engines return the
// OpenSearch format `[query, [suggestion, ...], ...]`, so we read element [1].
// Engines without a public suggest endpoint (e.g. Kagi) yield no suggestions.
const useSuggestions = (query: string) => {
  const engine = getSearchEngine();
  const suggestionLimit = getSuggestionLimit();
  const trimmed = query.trim();
  const url = suggestionLimit > 0 && trimmed.length > 0 ? buildSuggestUrl(trimmed, engine) : null;

  const { data, isLoading } = useFetch<string[]>(url ?? "", {
    execute: !!url,
    headers: { "User-Agent": "Mozilla/5.0" },
    parseResponse: async (response: Response): Promise<string[]> => {
      if (!response.ok) {
        return [];
      }
      try {
        const parsed = JSON.parse(await response.text());
        const list = Array.isArray(parsed) && Array.isArray(parsed[1]) ? (parsed[1] as string[]) : [];
        return list.filter((s) => typeof s === "string").slice(0, suggestionLimit);
      } catch {
        return [];
      }
    },
  });

  // Hide suggestions while a new query is in flight so a slower response for an
  // earlier keystroke can't briefly show stale results.
  return { suggestions: url && !isLoading ? (data ?? []) : [], isLoading: !!url && isLoading };
};

export default useSuggestions;
