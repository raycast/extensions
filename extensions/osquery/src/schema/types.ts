export interface OsqueryColumn {
  name: string;
  description: string;
  type: string;
  notes: string;
  hidden: boolean;
  required: boolean;
  index: boolean;
  platforms?: string[];
}

export interface OsqueryTable {
  name: string;
  description: string;
  url: string;
  platforms: string[];
  evented: boolean;
  cacheable: boolean;
  notes: string;
  examples: string[];
  columns: OsqueryColumn[];
}

export type OsquerySchema = OsqueryTable[];

export type Platform = "darwin" | "linux" | "windows" | "all";

export const PLATFORM_LABELS: Record<string, string> = {
  darwin: "macOS",
  linux: "Linux",
  windows: "Windows",
  all: "All",
};

// Platform icons - light/dark mode support
export const PLATFORM_ICONS: Record<
  string,
  { source: { light: string; dark: string } }
> = {
  darwin: { source: { light: "apple-icon.svg", dark: "apple-icon-dark.svg" } },
  linux: { source: { light: "linux-icon.svg", dark: "linux-icon-dark.svg" } },
  windows: {
    source: { light: "windows-icon.svg", dark: "windows-icon-dark.svg" },
  },
};
