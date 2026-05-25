export type Source =
  | "homebrew-cask"
  | "homebrew-formula"
  | "mas"
  | "sparkle"
  | "electron"
  | "github"
  | "devmate"
  | "npm"
  | "pip"
  | "gem"
  | "unknown";

export interface InstalledApp {
  name: string;
  appPath: string;
  bundleId: string;
  version: string;
  buildNumber: string;
  sparkleFeedUrl?: string;
  hasAppStoreReceipt: boolean;
  isElectron: boolean;
  isApple: boolean;
  iconPath?: string;
  /** A Homebrew cask token if one was found that matches this app. Independent of whether the app is currently brew-managed. */
  suggestedCask?: string;
  /** True if the app is currently installed via Homebrew (cask token is known and in `brew list --cask`). */
  managedByBrew?: boolean;
  /** Bundle ID lookup hit in the curated known-installs registry (third-party taps, MAS-only apps). */
  knownInstallKind?: "brew-tap" | "mas" | "cask";
  knownInstallDescription?: string;
}

export interface UpdateInfo {
  app: InstalledApp;
  source: Source;
  latestVersion: string;
  latestBuild?: string;
  hasUpdate: boolean;
  releaseNotesUrl?: string;
  releaseNotesHtml?: string;
  downloadUrl?: string;
  caskToken?: string;
  masId?: number;
  checkedAt: number;
}

export interface CliPackage {
  id: string;
  name: string;
  currentVersion: string;
  latestVersion: string;
  source: Source;
}

export interface UpdateResult {
  name: string;
  source: Source;
  success: boolean;
  error?: string;
}
