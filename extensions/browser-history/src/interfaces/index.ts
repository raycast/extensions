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
  readonly enableDia: boolean;
  readonly enableComet: boolean;
  readonly enableChatGPTAtlas: boolean;
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
  readonly profilePathDia?: string;
  readonly profilePathComet?: string;
  readonly profilePathChatGPTAtlas?: string;
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
  Dia = "Dia",
  Comet = "Comet",
  ChatGPTAtlas = "ChatGPTAtlas",
}

export type HistoryQueryFunction = (table: string, date_field: string, terms: string[]) => string;

export type ChatGPTAtlasLocalState = {
  profile: {
    last_used: string;
    info_cache: Record<string, { name: string; active_time?: number }>;
  };
};
