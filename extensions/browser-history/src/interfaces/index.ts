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
  readonly enableIridium: boolean;
  readonly enableOrion: boolean;
  readonly enableSidekick: boolean;
  readonly profilePathChrome?: string;
  readonly profilePathFirefox?: string;
  readonly profilePathSafari?: string;
  readonly profilePathEdge?: string;
  readonly profilePathBrave?: string;
  readonly profilePathVivaldi?: string;
  readonly profilePathArc?: string;
  readonly profilePathOpera?: string;
  readonly profilePathIridium?: string;
  readonly profilePathOrion?: string;
  readonly profilePathSidekick?: string;
  readonly firstInResults: SupportedBrowsers;
  readonly defaultBrowser?: SupportedBrowsers & "Default";
  readonly searchEngine?: string;
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
  readonly browser: SupportedBrowsers;
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
  Iridium = "Iridium",
  Orion = "Orion",
  Sidekick = "Sidekick",
}

export type HistoryQueryFunction = (table: string, date_field: string, terms: string[]) => string;
