import type { Profile, Scope, SearchResult, Source } from "../types";
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
export interface BrowserOptions {
  scope: Scope;
  historyLimit: number;
  includeIncognito: boolean;
  startupPreview: boolean;
}

export const defaultBrowserOptions: BrowserOptions = {
  scope: "all",
  historyLimit: 20000,
  includeIncognito: false,
  startupPreview: true,
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
  if (!isScope(value.scope)) throw new Error("无效的搜索来源。");
  const limit = Number(value.historyLimit);
  return {
    scope: value.scope,
    historyLimit:
      Number.isSafeInteger(limit) && limit > 0
        ? Math.min(limit, 100000)
        : 20000,
    includeIncognito: value.includeIncognito === true,
    startupPreview: value.startupPreview !== false,
  };
}
