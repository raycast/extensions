export const GLOBAL_SEARCH_CATEGORIES = ["conversations", "messages", "projects", "setup", "suggestions"] as const;
export const RAYCAST_SEARCH_PROTOCOL_VERSION = 1 as const;
export const RAYCAST_SEARCH_MAX_REQUEST_BYTES = 8 * 1024;

export type GlobalSearchCategory = (typeof GLOBAL_SEARCH_CATEGORIES)[number];

interface GlobalSearchResultBase {
  id: string;
  category: GlobalSearchCategory;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  rank: number;
  updatedAt: number;
}

export interface GlobalMessageSearchResult extends GlobalSearchResultBase {
  category: "messages";
  conversationRef: string;
  conversationId: string;
  transcriptMatchKey: string;
  matchLabel: "User" | "Assistant" | "Tool result" | "Tool" | "Tasks updated";
  turnPosition: number | null;
  focusEventId: number | null;
  focusToolCallId: number | null;
}

export interface GlobalConversationSearchResult extends GlobalSearchResultBase {
  category: "conversations";
  conversationRef: string;
  conversationId: string;
  projectId: string | null;
  workspaceLocationId: string | null;
  harnessId: string;
}

export interface GlobalProjectSearchResult extends GlobalSearchResultBase {
  category: "projects";
  projectId: string;
  root: string;
}

export interface GlobalSetupSearchResult extends GlobalSearchResultBase {
  category: "setup";
  artifactId: string;
  projectId: string | null;
  harnessId: string;
  sourcePath: string | null;
}

export interface GlobalSuggestionSearchResult extends GlobalSearchResultBase {
  category: "suggestions";
  suggestionId: string;
  status: string;
}

export type GlobalSearchResult =
  | GlobalConversationSearchResult
  | GlobalMessageSearchResult
  | GlobalProjectSearchResult
  | GlobalSetupSearchResult
  | GlobalSuggestionSearchResult;

export interface GlobalSearchPage {
  results: GlobalSearchResult[];
  truncated: boolean;
}

export interface SearchRequest {
  version: 1;
  type: "search";
  id: number;
  query: string;
  categories: GlobalSearchCategory[];
}

export type SearchResponse =
  | { version: 1; type: "ready"; supportedVersions: number[] }
  | { version: 1; type: "search-result"; id: number; ok: true; page: GlobalSearchPage }
  | { version: 1; type: "search-result"; id: number; ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isSearchResult(value: unknown): value is GlobalSearchResult {
  if (!isRecord(value) || !GLOBAL_SEARCH_CATEGORIES.includes(value.category as GlobalSearchCategory)) return false;
  if (
    typeof value.id !== "string" ||
    typeof value.title !== "string" ||
    (value.subtitle !== null && typeof value.subtitle !== "string") ||
    (value.excerpt !== null && typeof value.excerpt !== "string") ||
    typeof value.rank !== "number" ||
    typeof value.updatedAt !== "number"
  ) {
    return false;
  }
  switch (value.category) {
    case "conversations":
      return typeof value.conversationRef === "string" && typeof value.conversationId === "string";
    case "messages":
      return (
        typeof value.conversationRef === "string" &&
        typeof value.conversationId === "string" &&
        typeof value.transcriptMatchKey === "string"
      );
    case "projects":
      return typeof value.projectId === "string" && typeof value.root === "string";
    case "setup":
      return typeof value.artifactId === "string";
    case "suggestions":
      return typeof value.suggestionId === "string";
    default:
      return false;
  }
}

export function parseSearchResponse(line: string): SearchResponse {
  const value: unknown = JSON.parse(line);
  if (!isRecord(value) || value.version !== RAYCAST_SEARCH_PROTOCOL_VERSION) {
    throw new TypeError("Invalid Blume search response");
  }
  if (
    value.type === "ready" &&
    Array.isArray(value.supportedVersions) &&
    value.supportedVersions.every((version) => Number.isSafeInteger(version))
  ) {
    return value as SearchResponse;
  }
  if (value.type !== "search-result" || !Number.isSafeInteger(value.id) || typeof value.ok !== "boolean") {
    throw new TypeError("Invalid Blume search response");
  }
  if (value.ok) {
    if (
      !isRecord(value.page) ||
      typeof value.page.truncated !== "boolean" ||
      !Array.isArray(value.page.results) ||
      !value.page.results.every(isSearchResult)
    ) {
      throw new TypeError("Invalid Blume search response");
    }
  } else if (typeof value.error !== "string") {
    throw new TypeError("Invalid Blume search response");
  }
  return value as SearchResponse;
}
