export const MOBBIN_API_BASE_URL = "https://api.mobbin.com";
export const MOBBIN_MCP_URL = "https://api.mobbin.com/mcp";
export const MOBBIN_MCP_SETTINGS_URL = "https://mobbin.com/settings/mcp";

export type AuthMode = "api-key" | "oauth-mcp";
export type Platform = "ios" | "web";
export type SearchMode = "deep" | "standard";
export type ImageQuality = "optimized" | "high";
export type McpImageFormat = "webp" | "jpg";
export type SearchKind = "screen" | "flow" | "section";
export type ReferenceSource = "api" | "mcp";

export type ReferenceImage = {
  url?: string;
  dataUrl?: string;
  mimeType?: string;
  expiresAt?: string;
  width?: number;
  height?: number;
  localPath?: string;
};

type BaseReference = {
  id: string;
  title: string;
  appName: string;
  platform: Platform;
  mobbinUrl: string;
  source: ReferenceSource;
};

export type ScreenReference = BaseReference & {
  kind: "screen";
  image: ReferenceImage;
};

export type FlowReference = BaseReference & {
  kind: "flow";
  screens: ScreenReference[];
  coverImage?: ReferenceImage;
};

export type SectionReference = BaseReference & {
  kind: "section";
  image: ReferenceImage;
};

export type MobbinReference =
  ScreenReference | FlowReference | SectionReference;

export type ImageReference = ScreenReference | SectionReference;

export type SearchOptions = {
  kind: SearchKind;
  query: string;
  platform: Platform;
  mode: SearchMode;
  imageQuality: ImageQuality;
  mcpImageFormat: McpImageFormat;
  limit: number;
  excludeScreenIds: string[];
};

export type SearchHistoryEntry = SearchOptions & {
  id: string;
  createdAt: string;
};

export type FavoriteReference = ImageReference & {
  favoritedAt: string;
};

export type SearchCapabilities = {
  screen: boolean;
  flow: boolean;
  section: boolean;
};

export type SearchClient = {
  connect(signal?: AbortSignal): Promise<void>;
  getCapabilities(signal?: AbortSignal): Promise<SearchCapabilities>;
  search(
    options: SearchOptions,
    signal?: AbortSignal,
  ): Promise<MobbinReference[]>;
  dispose(): Promise<void>;
};
