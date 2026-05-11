// src/utils/types.ts
export interface SearchResult {
  id: string;
  description?: string;
  query: string;
  url: string;
  hasBang?: boolean;
  isNavigation?: boolean;
  isHistory?: boolean;
  isApiResult?: boolean;
  isFastGPT?: boolean;
  content?: string; // For storing response content
  references?: {
    title: string;
    snippet: string;
    url: string;
  }[];
}

export const HISTORY_KEY = "history";
