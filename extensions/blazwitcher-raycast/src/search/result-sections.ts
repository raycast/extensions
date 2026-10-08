import type { SearchResult, Source } from "../types";

export interface ResultSection {
  key: "suggestions" | "tabs" | "history" | "bookmarks";
  title: string;
  results: SearchResult[];
}

const topSuggestionCount = 2;
const sourceSections: Array<{
  key: ResultSection["key"];
  source: Source;
  title: string;
}> = [
  { key: "tabs", source: "tab", title: "已打开标签页" },
  { key: "history", source: "history", title: "最近历史记录" },
  { key: "bookmarks", source: "bookmark", title: "书签" },
];

export function createResultSections(
  results: SearchResult[],
  query: string,
): ResultSection[] {
  const sections: ResultSection[] = [];
  let remaining = results;
  if (query.trim() && results.length) {
    const suggestions = results.slice(0, topSuggestionCount);
    sections.push({
      key: "suggestions",
      title: "最优建议",
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
