export type UpdateSource = "sparkle" | "cask" | "mas";

export type AppUpdate = {
  name: string;
  currentVersion: string;
  latestVersion: string;
  source: UpdateSource;
  downloadUrl?: string;
  appPath?: string;
  bundleId?: string;
};

export type ToolStatus = {
  brew: boolean;
  mas: boolean;
};
