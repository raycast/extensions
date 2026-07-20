import { lib } from "asciilib";
import { SearchResult } from "../types";

export interface AsciiLibEntry {
  name: string;
  entry: string;
  keywords: string[];
  category: string;
}

export function searchForResults(keyword: string): Promise<AsciiLibEntry[]> {
  const lowercaseKeyword = keyword.toLowerCase();
  const database = Object.entries(lib).map((e) => e[1]) as AsciiLibEntry[];

  const filteredResults = database.filter((entry: AsciiLibEntry) => {
    return (
      entry.name.toLowerCase().includes(lowercaseKeyword) ||
      entry.keywords.some((keyword) => keyword.toLowerCase().includes(lowercaseKeyword)) ||
      entry.category.toLowerCase().includes(lowercaseKeyword)
    );
  });

  return Promise.resolve(filteredResults);
}

export async function performSearch(searchText: string): Promise<SearchResult[]> {
  const results = await searchForResults(searchText);

  return results.map((entry: AsciiLibEntry) => {
    return {
      id: `${entry.entry}-${entry.name}`,
      name: entry.entry,
      description: entry.name,
      category: entry.category,
    };
  });
}
