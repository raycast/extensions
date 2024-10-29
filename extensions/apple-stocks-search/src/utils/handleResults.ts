// handleResults.ts
import { stockList } from "./stockData";
import { SearchResult } from "./types";

export function getStaticResult(searchText: string): SearchResult[] {
  if (!searchText) return [];
  const lowerSearchText = searchText.toLowerCase();
  return stockList.filter((stock: SearchResult) => stock.query.toLowerCase().includes(lowerSearchText));
}
