import Fuse from "fuse.js";
import { CometTab, CometHistoryEntry, SearchResult } from "./types";

export class SearchEngine {
  private fuseOptions: Fuse.IFuseOptions<SearchResult> = {
    keys: [
      { name: "data.title", weight: 0.4 },
      { name: "data.url", weight: 0.6 },
    ],
    threshold: 0.2, // More precise matching for better performance
    includeScore: true,
    shouldSort: true,
    minMatchCharLength: 1,
    distance: 100,
    useExtendedSearch: true,
    ignoreLocation: true,
  };

  // Cache for frequently used searches
  private searchCache = new Map<string, SearchResult[]>();
  private maxCacheSize = 50;

  private addToCache(query: string, results: SearchResult[]) {
    if (this.searchCache.size >= this.maxCacheSize) {
      // Remove oldest entry
      const firstKey = this.searchCache.keys().next().value;
      this.searchCache.delete(firstKey);
    }
    this.searchCache.set(query, results);
  }

  private getFromCache(query: string): SearchResult[] | undefined {
    return this.searchCache.get(query);
  }

  search(query: string, tabs: CometTab[], history: CometHistoryEntry[]): SearchResult[] {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      // Return all results with tabs prioritized when no search query
      return [
        ...tabs.map((tab) => ({ type: "tab" as const, data: tab, score: 0 })),
        ...history.slice(0, 30).map((entry) => ({ type: "history" as const, data: entry, score: 0 })),
      ];
    }

    // Check cache first for performance
    const cached = this.getFromCache(normalizedQuery);
    if (cached) {
      return cached;
    }

    // Convert to SearchResult format
    const searchItems: SearchResult[] = [
      ...tabs.map((tab) => ({ type: "tab" as const, data: tab })),
      ...history.map((entry) => ({ type: "history" as const, data: entry })),
    ];

    const fuse = new Fuse(searchItems, this.fuseOptions);
    const results = fuse.search(normalizedQuery);

    // Custom sorting: tabs first, then by relevance score
    const sortedResults = results
      .map((result) => ({
        ...result.item,
        score: result.score || 0,
      }))
      .sort((a, b) => {
        // Tabs always come before history
        if (a.type === "tab" && b.type === "history") return -1;
        if (a.type === "history" && b.type === "tab") return 1;

        // Within same type, sort by score (lower is better with Fuse.js)
        return (a.score || 0) - (b.score || 0);
      })
      .slice(0, 50); // Limit results for performance

    // Cache the results
    this.addToCache(normalizedQuery, sortedResults);

    return sortedResults;
  }

  searchTabs(query: string, tabs: CometTab[]): CometTab[] {
    if (!query.trim()) {
      return tabs;
    }

    const fuseOptions: Fuse.IFuseOptions<CometTab> = {
      keys: [
        { name: "title", weight: 0.4 },
        { name: "url", weight: 0.6 },
      ],
      threshold: 0.2, // More precise matching
      includeScore: true,
      shouldSort: true,
      minMatchCharLength: 1,
      distance: 50, // Reduced for better performance
      ignoreLocation: true,
    };

    const fuse = new Fuse(tabs, fuseOptions);
    return fuse.search(query).map((result) => result.item);
  }

  searchHistory(query: string, history: CometHistoryEntry[]): CometHistoryEntry[] {
    if (!query.trim()) {
      return history.slice(0, 50); // Limit initial results for performance
    }

    const fuseOptions: Fuse.IFuseOptions<CometHistoryEntry> = {
      keys: [
        { name: "title", weight: 0.4 },
        { name: "url", weight: 0.6 },
      ],
      threshold: 0.2, // More precise matching
      includeScore: true,
      shouldSort: true,
      minMatchCharLength: 1,
      distance: 50, // Reduced for better performance
      ignoreLocation: true,
    };

    const fuse = new Fuse(history, fuseOptions);
    const results = fuse.search(query).map((result) => result.item);
    return results.slice(0, 100); // Limit results for performance
  }
}

export const searchEngine = new SearchEngine();
