import type { Bookmark, Catalog, Heads, Mutation } from "../model.ts";

export interface ImportDifference {
  entityKey: string;
  local: Bookmark | Catalog;
  incoming: Bookmark | Catalog;
}

export interface ImportPlan {
  data: { catalog: Catalog; bookmarks: Bookmark[] };
  warnings: string[];
  counts: {
    bookmarks: number;
    groups: number;
    attachments: number;
    generatedIds: number;
    missingTimes: number;
    identical: number;
    sameUrl: number;
  };
  differences: ImportDifference[];
  mutations: Mutation[];
  expectedHeads: Heads;
  /** Shared sources replace usage totals and preserve their portable icons. */
  authoritative?: boolean;
}

export type ImportDecisions = Record<string, "local" | "incoming">;
