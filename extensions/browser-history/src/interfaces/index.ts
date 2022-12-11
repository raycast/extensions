export interface Preferences {
  readonly enableChrome: boolean;
  readonly enableFirefox: boolean;
  readonly enableSafari: boolean;
  readonly enableEdge: boolean;
  readonly enableBrave: boolean;
  readonly enableVivaldi: boolean;
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
  readonly entriesEdge: HistoryEntry[];
  readonly entriesBrave: HistoryEntry[];
  readonly entriesVivaldi: HistoryEntry[];
  readonly error?: unknown;
  readonly isLoading: boolean;
}

export enum SupportedBrowsers {
  Chrome = "Chrome",
  Firefox = "Firefox",
  Safari = "Safari",
  Edge = "Edge",
  Brave = "Brave",
  Vivaldi = "Vivaldi",
}

export type HistoryQueryFunction = (table: string, date_field: string, terms: string[]) => string;
