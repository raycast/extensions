import { Memory } from "mem0ai";

export interface MemoryResult {
  memory: string;
  event?: string;
}

// Re-export Memory type from mem0ai SDK
export type { Memory };

// SearchResult is essentially the same as Memory from the SDK
export type SearchResult = Memory;

export interface SearchResponse {
  results: SearchResult[];
}

export interface GetAllResponse {
  results: Memory[];
}

export interface Preferences {
  mem0ApiKey: string;
  defaultUserId: string;
}
