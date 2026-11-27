export type ElevationMethod = "uac" | "gsudo" | "terminal" | "none";

export interface ChocoPreferences {
  chocoPath?: string;
  elevationMethod: ElevationMethod;
  confirmAutomatically: boolean;
  useCommunityApi: boolean;
  includePrerelease: boolean;
  showPackageIcons: boolean;
}

export interface InstalledPackage {
  id: string;
  version: string;
  pinned: boolean;
}

export interface OutdatedPackage {
  id: string;
  currentVersion: string;
  availableVersion: string;
  pinned: boolean;
}

export interface ChocoSource {
  name: string;
  url: string;
  disabled: boolean;
  username?: string;
  certificate?: string;
  priority: number;
  bypassProxy: boolean;
  allowSelfService: boolean;
  adminOnly: boolean;
}

export interface ChocoPackage {
  id: string;
  title: string;
  version: string;
  summary?: string;
  description?: string;
  authors?: string;
  projectUrl?: string;
  packageUrl?: string;
  licenseUrl?: string;
  iconUrl?: string;
  tags?: string[];
  dependencies?: string[];
  downloadCount?: number;
  versionDownloadCount?: number;
  published?: string;
  isPrerelease?: boolean;
  packageHash?: string;
}

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  launchedInTerminal?: boolean;
}
