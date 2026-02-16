export type BrowserType = "Chrome" | "Edge" | "Firefox" | "Comet";

export interface BrowserProfile {
  id: string;
  browser: BrowserType;
  originalName: string;
  folderPath: string;
  isRelative?: boolean;
}

export interface ProfileMetadata {
  alias?: string;
  tags: string[];
}

export type ProfileMetadataMap = Record<string, ProfileMetadata>;

export interface ResolvedBrowserProfile extends BrowserProfile {
  alias?: string;
  tags: string[];
  displayName: string;
}

export interface ScanWarning {
  browser: BrowserType;
  message: string;
  path?: string;
  code?: string;
}

export interface ScanResult {
  profiles: BrowserProfile[];
  warnings: ScanWarning[];
}
