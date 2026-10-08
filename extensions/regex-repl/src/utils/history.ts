export const HISTORY_KEY = "regex-repl::regex-history";
export const MAX_HISTORY_SIZE = 100;

export interface RegexHistoryItem {
  pattern: string;
  flags: string[];
  timestamp: number;
  isPinned: boolean;
}

export let selectedRegex: RegexHistoryItem | undefined;

export function setSelectedRegex(item: RegexHistoryItem | undefined) {
  selectedRegex = item;
}
