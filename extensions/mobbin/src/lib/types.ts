export const MOBBIN_API_BASE_URL = "https://api.mobbin.com";
export const MOBBIN_MCP_URL = "https://api.mobbin.com/mcp";

export type AuthMode = "api-key" | "oauth-mcp";
export type Platform = "ios" | "web";
export type SearchMode = "deep" | "standard";
export type ImageQuality = "optimized" | "high";
export type ScreenSource = "api" | "mcp";

export type Screen = {
  id: string;
  image_url: string;
  mobbin_url: string;
  app_name: string;
  platform: Platform;
  source: ScreenSource;
};

export type SearchOptions = {
  query: string;
  platform: Platform;
  mode: SearchMode;
  image_quality: ImageQuality;
  limit: number;
  exclude_screen_ids: string[];
};

export type SearchHistoryEntry = {
  id: string;
  query: string;
  platform: Platform;
  mode: SearchMode;
  image_quality: ImageQuality;
  limit: number;
  createdAt: string;
};

export type FavoriteScreen = Screen & {
  favoritedAt: string;
};

export type Preferences = {
  authMode: AuthMode;
  apiKey?: string;
  defaultPlatform: Platform;
  defaultSearchMode: SearchMode;
  defaultImageQuality: ImageQuality;
  defaultLimit: "10" | "20" | "50" | "100";
};

export type MobbinApiScreenSearchResponse = {
  screens?: unknown;
};

export type SearchClient = {
  searchScreens(options: SearchOptions, signal?: AbortSignal): Promise<Screen[]>;
};
