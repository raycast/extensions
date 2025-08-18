import { Application, getApplications } from "@raycast/api";
import { cacheFunc } from "cache-func";
import { isMacOs, isWin } from "../utils";

const cachedGetApplications = cacheFunc(getApplications);

// Map of build names to bundle IDs
const bundleIdMap: Record<string, { macos: string; windows: string }> = {
  Code: { macos: "com.microsoft.VSCode", windows: "/Applications/bf529bb3-7152-5c7a-a51b-0b5e131a7bcd" },
  "Code - Insiders": { macos: "com.microsoft.VSCodeInsiders", windows: "" },
  Cursor: { macos: "com.todesktop.230313mzl4w4u92", windows: "" },
  Kiro: { macos: "dev.kiro.desktop", windows: "" },
  Positron: { macos: "com.rstudio.positron", windows: "" },
  Trae: { macos: "com.trae.app", windows: "" },
  "Trae CN": { macos: "cn.trae.app", windows: "" },
  VSCodium: { macos: "com.vscodium", windows: "/Applications/2f570d4f-24b1-5e62-ba2f-0871fd0602e5" },
  "VSCodium - Insiders": { macos: "com.vscodium.VSCodiumInsiders", windows: "" },
  Windsurf: { macos: "com.exafunction.windsurf", windows: "" },
};

/**
 * Get the bundle ID for the specified build name
 * @param buildName The name of the build (e.g., "Code", "VSCodium", etc.)
 * @returns The bundle ID for the specified build
 */
export function getBundleId(buildName: string): string {
  if (isWin) return bundleIdMap[buildName].windows || "";
  return bundleIdMap[buildName].macos || "";
}

/**
 * Get the application for the specified build name
 * @param buildName The name of the build (e.g., "Code", "VSCodium", etc.)
 * @returns Promise resolving to the Application object or undefined if not found
 */
export async function getEditorApplication(buildName: string): Promise<Application | undefined> {
  const apps = await cachedGetApplications();

  // Find the app by bundle ID
  const bundleId = bundleIdMap[buildName];
  if (isMacOs) {
    if (bundleId) {
      const app = apps.find((app) => app.bundleId === bundleId.macos);
      if (app) return app;
    }
  } else {
    const app = apps.find((app) => app.windowsAppId === bundleId.windows);
    if (app) return app;
  }

  return undefined;
}
