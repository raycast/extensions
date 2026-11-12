import type { Profile, Scope, SearchResult, Source } from "../types";
import { parseHistoryDays, parseHistoryLimit } from "./history";
import {
  defaultSearchParameters,
  normalizeSearchParameters,
  type SearchParameters,
} from "../search/config";
export interface SourceState {
  loading: boolean;
  warnings: string[];
  count: number;
  cached?: boolean;
}
export interface DataSnapshot {
  version: number;
  profiles: Pick<Profile, "id" | "name">[];
  profileId: string;
  states: Record<Source, SourceState>;
}
export interface SearchRequest {
  requestId: number;
  version: number;
  query: string;
  scope: Scope;
  offset: number;
}
export interface SearchPage {
  requestId: number;
  version: number;
  total: number;
  offset: number;
  results: SearchResult[];
}
export interface ResultRef {
  id: string;
  version: number;
  requestId: number;
}
export interface BrowserOptions extends Partial<SearchParameters> {
  scope: Scope;
  historyLimit: number;
  includeIncognito: boolean;
  startupPreview: boolean;
  searchStrategy?: "chrome" | "full-url";
  historyDays?: number;
}

export const defaultBrowserOptions: BrowserOptions = {
  ...defaultSearchParameters,
  scope: "all",
  historyLimit: 1000,
  includeIncognito: false,
  startupPreview: true,
  searchStrategy: "chrome",
  historyDays: 14,
};

export function isScope(value: unknown): value is Scope {
  return (
    typeof value === "string" &&
    ["all", "tab", "bookmark", "history"].includes(value)
  );
}

export function normalizeBrowserOptions(
  value: Partial<BrowserOptions>,
): BrowserOptions {
  if (!isScope(value.scope)) throw new Error("Invalid search source.");
  return {
    ...normalizeSearchParameters(value),
    scope: value.scope,
    historyLimit: parseHistoryLimit(
      value.historyLimit === undefined ? undefined : String(value.historyLimit),
    ),
    historyDays: parseHistoryDays(value.historyDays),
    searchStrategy: value.searchStrategy === "full-url" ? "full-url" : "chrome",
    includeIncognito: value.includeIncognito === true,
    startupPreview: value.startupPreview !== false,
  };
}
