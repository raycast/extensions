import { ReactNode } from "react";

export interface Preferences {
  readonly enableChrome: boolean;
  readonly enableFirefox: boolean;
  readonly enableSafari: boolean;
  readonly enableEdge: boolean;
  readonly enableBrave: boolean;
  readonly enableVivaldi: boolean;
  readonly enableArc: boolean;
  readonly firstInResults: string;
}

export interface SearchResult {
  readonly browser: SupportedBrowsers;
  readonly isLoading: boolean;
  readonly permissionView?: ReactNode;
  readonly data?: HistoryEntry[] | undefined;
}
export interface HistoryEntry {
  readonly id: string;
  readonly url: string;
  readonly title: string;
  readonly lastVisited: Date;
}

export enum SupportedBrowsers {
  Chrome = "Chrome",
  Firefox = "Firefox",
  Safari = "Safari",
  Edge = "Edge",
  Brave = "Brave",
  Vivaldi = "Vivaldi",
  Arc = "Arc",
}

export type HistoryQueryFunction = (table: string, date_field: string, terms: string[]) => string;
