import { Application, getApplications } from "@raycast/api";
import { cacheFunc } from "cache-func";
import path from "node:path";
import { isMacOs } from "../utils";

const cachedGetApplications = cacheFunc(getApplications);

// Map of build names to bundle IDs
const bundleIdMap: Record<string, { macos: string; windows: { name: string; exe: string } }> = {
  Code: { macos: "com.microsoft.VSCode", windows: { name: "Visual Studio Code", exe: "Code.exe" } },
  "Code - Insiders": {
    macos: "com.microsoft.VSCodeInsiders",
    windows: { name: "Visual Studio Code - Insiders", exe: "Code - Insiders.exe" },
  },
  Cursor: { macos: "com.todesktop.230313mzl4w4u92", windows: { name: "Cursor", exe: "Cursor.exe" } },
  Kiro: { macos: "dev.kiro.desktop", windows: { name: "Kiro", exe: "Kiro.exe" } },
  Positron: { macos: "com.rstudio.positron", windows: { name: "Positron", exe: "Positron.exe" } },
  Trae: { macos: "com.trae.app", windows: { name: "Trae", exe: "Trae.exe" } },
  "Trae CN": { macos: "cn.trae.app", windows: { name: "Trae CN", exe: "Trae - CN.exe" } },
  VSCodium: { macos: "com.vscodium", windows: { name: "VSCodium", exe: "VSCodium.exe" } },
  "VSCodium - Insiders": {
    macos: "com.vscodium.VSCodiumInsiders",
    windows: { name: "VSCodium - Insiders", exe: "VSCodium - Insiders.exe" },
  },
  Windsurf: { macos: "com.exafunction.windsurf", windows: { name: "Windsurf", exe: "Windsurf.exe" } },
};

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
    const app = apps.find((app) => {
      const isNameMatch = app.name === bundleId.windows.name;

      const exeFromPath = path.basename(app.path);
      const isExeMatch = exeFromPath === bundleId.windows.exe;

      return isNameMatch || isExeMatch;
    });
    if (app) return app;
  }

  return undefined;
}
