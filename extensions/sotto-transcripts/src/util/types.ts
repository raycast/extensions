export interface Preferences {
  historyPath?: string;
}

export interface RawEntry {
  id: string;
  transcript?: string;
  startedAt?: string;
  duration?: number;
  source?: string;
  status?: string;
  filePath?: string;
  transcriptionModelName?: string;
  transcriptionCostUSD?: number;
  transcriptionDuration?: number;
}

export interface HistoryFile {
  entries?: RawEntry[];
}

export interface Entry {
  id: string;
  transcript: string;
  startedAt: Date | null;
  duration: number;
  source: string;
  status: string;
  filePath: string;
  model: string;
  keywords: string[];
  wordCount: number;
  costUSD: number;
}

export interface EntryGroup {
  label: string;
  entries: Entry[];
}
