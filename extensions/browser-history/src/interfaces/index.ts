export interface Preferences {
  readonly enableChrome: boolean;
  readonly enableFirefox: boolean;
  readonly enableSafari: boolean;
  readonly firstInResults: string;
}

export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly lastVisited: Date;
}

export interface HistorySearchResults {
  readonly entriesChrome: HistoryEntry[];
  readonly entriesFirefox: HistoryEntry[];
  readonly entriesSafari: HistoryEntry[];
  readonly error?: unknown;
  readonly isLoading: boolean;
}

export enum SupportedBrowsers {
  Chrome = "Chrome",
  Firefox = "Firefox",
  Safari = "Safari",
}
