export interface GlazeApp {
  id: string;
  name: string;
  displayName?: string;
  description?: string;
  author?: string;
  storeAppId?: string;
  variant?: "local" | "store" | "preview";
  version: string;
  path: string;
  bundlePath?: string;
  runtimePath?: string;
  sourcesPath?: string;
  createdAt: number;
  sdkVersion?: string;
  needsUpdate?: boolean;
  updateType?: "patch" | "minor" | "major";
}

export interface StoreApp {
  id: string;
  public_id: string;
  display_name: string;
  description: string | null;
  full_description: string | null;
  icon_url: string | null;
  latest_version: string | null;
  category?: string | null;
  profiles: { username: string; display_name: string | null } | null;
}

export interface StoreOrganization {
  id: string;
  name: string;
  slug: string;
  avatar_url?: string | null;
  teamStoreAccess?: { canInstallFromStore: boolean };
}

export type EditorApp = "cursor" | "vscode" | "zed";

export const EDITOR_APPS: Record<
  EditorApp,
  { label: string; bundleId: string; appName: string }
> = {
  cursor: {
    label: "Cursor",
    bundleId: "com.todesktop.230313mzl4w4u92",
    appName: "Cursor",
  },
  vscode: {
    label: "Visual Studio Code",
    bundleId: "com.microsoft.VSCode",
    appName: "Visual Studio Code",
  },
  zed: { label: "Zed", bundleId: "dev.zed.Zed", appName: "Zed" },
};
