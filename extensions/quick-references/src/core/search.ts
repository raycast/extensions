import Fuse from "fuse.js";
import { ReferenceIndexItem } from "../types";

export interface SearchResult {
  item: ReferenceIndexItem;
  score?: number;
}

export class ReferenceSearcher {
  private readonly fuse: Fuse<ReferenceIndexItem>;
  private readonly source: ReferenceIndexItem[];

  constructor(entries: ReferenceIndexItem[]) {
    this.source = [...entries];
    this.fuse = new Fuse(entries, {
      keys: [
        { name: "title", weight: 0.4 },
        { name: "tags", weight: 0.2 },
        { name: "headings", weight: 0.2 },
        { name: "summary", weight: 0.15 },
        { name: "topSnippet", weight: 0.05 },
      ],
      threshold: 0.35,
      includeScore: true,
    });
  }

  search(query: string): SearchResult[] {
    if (!query.trim()) {
      return this.source
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((item) => ({ item }));
    }

    return this.fuse.search(query).map((match) => ({
      item: match.item,
      score: match.score ?? undefined,
    }));
  }
}
