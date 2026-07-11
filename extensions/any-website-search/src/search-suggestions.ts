import { decode as htmlDecode } from "he";
import { strEq } from "./utils";

export async function parseSuggestionsFromGoogle(response: Response, searchString: string): Promise<string[]> {
  const xml = await response.text();
  const suggestionMatches = xml.matchAll(/<suggestion data="(.*?)"\/>/g);
  const suggestions: string[] = [];

  for (const match of suggestionMatches) {
    const suggestion = match[1]; // capture group 1
    if (!strEq(suggestion, searchString)) {
      suggestions.push(htmlDecode(suggestion));
    }
  }

  suggestions.unshift(searchString);

  return suggestions;
}

export async function parseSuggestionsFromDuckDuckGo(reponse: Response, searchString: string): Promise<string[]> {
  const json = await reponse.text();
  const ddgSuggestions = JSON.parse(json)[1];
  const suggestions: string[] = [];

  for (const suggestion of ddgSuggestions) {
    if (!strEq(suggestion, searchString)) {
      suggestions.push(htmlDecode(suggestion));
    }
  }

  suggestions.unshift(searchString);

  return suggestions;
}
