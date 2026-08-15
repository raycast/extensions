import { SearchResult } from "./utils";

export type SearchMode = "quick" | "full" | "custom";

export interface HistoryItem {
  ip: string;
  results: SearchResult[];
  timestamp: number;
  projectCount: number;
  mode?: SearchMode;
}

export interface ResultsViewProps {
  ip: string;
  mode: SearchMode;
  customProjectIds?: string[];
  initialResults?: SearchResult[];
  onSaveToHistory: (
    ip: string,
    results: SearchResult[],
    mode: SearchMode,
  ) => Promise<void>;
  onSearchAgain: (ip: string) => Promise<void>;
  onRemoveFromHistory: (ip: string) => Promise<void>;
}
