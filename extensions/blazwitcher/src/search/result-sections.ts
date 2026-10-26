import type { SearchResult, Source } from "../types";

export interface ResultSection {
  key: "suggestions" | "tabs" | "history" | "bookmarks";
  title: string;
  results: SearchResult[];
}

const sourceSections: Array<{
  key: ResultSection["key"];
  source: Source;
  title: string;
}> = [
  { key: "tabs", source: "tab", title: "Open Tabs" },
  { key: "history", source: "history", title: "History" },
  { key: "bookmarks", source: "bookmark", title: "Bookmarks" },
];

export function createResultSections(
  results: SearchResult[],
  query: string,
  topSuggestionsCount = 2,
): ResultSection[] {
  const sections: ResultSection[] = [];
  let remaining = results;
  if (query.trim() && results.length) {
    const suggestions = results.slice(0, topSuggestionsCount);
    sections.push({
      key: "suggestions",
      title: "Top Suggestions",
      results: suggestions,
    });
    remaining = results.slice(suggestions.length);
  }
  for (const section of sourceSections) {
    const sourceResults = remaining.filter(
      (result) => result.entry.source === section.source,
    );
    if (sourceResults.length)
      sections.push({ ...section, results: sourceResults });
  }
  return sections;
}
