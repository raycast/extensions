import { ReactNode } from "react";

export interface Preferences {
  readonly enableChrome: boolean;
  readonly enableFirefox: boolean;
  readonly enableSafari: boolean;
  readonly enableEdge: boolean;
  readonly enableBrave: boolean;
  readonly enableVivaldi: boolean;
  readonly enableArc: boolean;
  readonly enableOpera: boolean;
  readonly profilePathChrome?: string;
  readonly profilePathFirefox?: string;
  readonly profilePathSafari?: string;
  readonly profilePathEdge?: string;
  readonly profilePathBrave?: string;
  readonly profilePathVivaldi?: string;
  readonly profilePathArc?: string;
  readonly profilePathOpera?: string;
  readonly firstInResults: SupportedBrowsers;
  readonly defaultBrowser?: SupportedBrowsers & "Default";
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
  Opera = "Opera",
}

export type HistoryQueryFunction = (table: string, date_field: string, terms: string[]) => string;
