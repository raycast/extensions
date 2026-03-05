import { decode as htmlDecode } from "he";
import { strEq } from "./utils";

export type SuggestionProvider = "google" | "ddg" | "__NONE__";

/** Build the suggestion fetch URL for the given provider, or null if none. */
export function getSuggestionUrl(query: string, provider: SuggestionProvider): string | null {
  const encoded = encodeURIComponent(query);
  switch (provider) {
    case "google":
      return `https://suggestqueries.google.com/complete/search?output=toolbar&q=${encoded}`;
    case "ddg":
      return `https://duckduckgo.com/ac/?q=${encoded}&type=list`;
    default:
      return null;
  }
}

export async function parseSuggestionsFromGoogle(response: Response, searchString: string): Promise<string[]> {
  const xml = await response.text();
  const suggestionMatches = xml.matchAll(/<suggestion data="(.*?)"\/>/g);
  const suggestions: string[] = [];

  for (const match of suggestionMatches) {
    const suggestion = match[1];
    if (suggestion !== undefined && !strEq(suggestion, searchString)) {
      suggestions.push(htmlDecode(suggestion));
    }
  }

  suggestions.unshift(searchString);
  return suggestions;
}

export async function parseSuggestionsFromDuckDuckGo(response: Response, searchString: string): Promise<string[]> {
  const json = await response.text();
  const parsed = JSON.parse(json);
  const ddgSuggestions = Array.isArray(parsed?.[1]) ? (parsed[1] as string[]) : [];
  const suggestions: string[] = [];

  for (const suggestion of ddgSuggestions) {
    if (!strEq(suggestion, searchString)) {
      suggestions.push(htmlDecode(suggestion));
    }
  }

  suggestions.unshift(searchString);
  return suggestions;
}

/** Parse the response from the configured suggestion provider. */
export async function parseSuggestions(
  response: Response,
  searchString: string,
  provider: SuggestionProvider,
): Promise<string[]> {
  switch (provider) {
    case "google":
      return parseSuggestionsFromGoogle(response, searchString);
    case "ddg":
      return parseSuggestionsFromDuckDuckGo(response, searchString);
    default:
      return [searchString];
  }
}
