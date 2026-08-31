import { ReactElement } from "react";

export interface HistoryEntry {
  id: number;
  url: string;
  title: string;
  lastVisited: string;
}

export interface SearchResult<T> {
  data?: T[];
  errorView?: ReactElement;
  isLoading: boolean;
}

export type GroupedEntries = Map<string, HistoryEntry[]>;
