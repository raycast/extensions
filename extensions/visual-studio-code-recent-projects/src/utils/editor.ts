import { Application, getApplications } from "@raycast/api";
import { cacheFunc } from "cache-func";
import { isMac } from "../lib/utils";
import path from "path";

const cachedGetApplications = cacheFunc(getApplications);

const bundleIdMap: Record<string, { macos: string; windows: { name: string; exe: string } }> = {
  // Preference value stays "Antigravity" for backward compat (see getBuildNamePreference),
  // but the installed app was rebranded to "Antigravity IDE".
  "Antigravity IDE": {
    macos: "com.google.antigravity-ide",
    windows: { name: "Antigravity IDE", exe: "Antigravity IDE.exe" },
  },
  Code: { macos: "com.microsoft.VSCode", windows: { name: "Visual Studio Code", exe: "Code.exe" } },
  "Code - Insiders": {
    macos: "com.microsoft.VSCodeInsiders",
    windows: { name: "Visual Studio Code - Insiders", exe: "Code - Insiders.exe" },
  },
  Cursor: { macos: "com.todesktop.230313mzl4w4u92", windows: { name: "Cursor", exe: "Cursor.exe" } },
  "IBM Bob": { macos: "com.ibm.software.bob", windows: { name: "IBM Bob", exe: "IBM Bob.exe" } },
  Kiro: { macos: "dev.kiro.desktop", windows: { name: "Kiro", exe: "Kiro.exe" } },
  Positron: { macos: "com.rstudio.positron", windows: { name: "Positron", exe: "Positron.exe" } },
  Qoder: { macos: "com.qoder.ide", windows: { name: "Qoder", exe: "Qoder.exe" } },
  Trae: { macos: "com.trae.app", windows: { name: "Trae", exe: "Trae.exe" } },
  "Trae CN": { macos: "cn.trae.app", windows: { name: "Trae CN", exe: "Trae - CN.exe" } },
  VSCodium: { macos: "com.vscodium", windows: { name: "VSCodium", exe: "VSCodium.exe" } },
  "VSCodium - Insiders": {
    macos: "com.vscodium.VSCodiumInsiders",
    windows: { name: "VSCodium - Insiders", exe: "VSCodium - Insiders.exe" },
  },
  Devin: { macos: "com.exafunction.windsurf", windows: { name: "Devin", exe: "Devin.exe" } },
  Windsurf: { macos: "com.exafunction.windsurf", windows: { name: "Windsurf", exe: "Windsurf.exe" } },
  Lingma: { macos: "com.aliyun.lingma.ide", windows: { name: "Lingma", exe: "Lingma.exe" } },
};

/**
 * Get the application for the specified build name
 * @param buildName The name of the build (e.g., "Code", "VSCodium", etc.)
 * @returns Promise resolving to the Application object or undefined if not found
 */
export async function getEditorApplication(buildName: string): Promise<Application | undefined> {
  const apps = await cachedGetApplications();

  // Migrate legacy preference value to the rebranded app name.
  const normalizedBuildName = buildName === "Antigravity" ? "Antigravity IDE" : buildName;

  // Find the app by bundle ID
  const bundleId = bundleIdMap[normalizedBuildName];
  if (isMac) {
    if (bundleId) {
      const app = apps.find((app) => {
        if (app.bundleId !== bundleId.macos) return false;

        // Special case for Windsurf and Devin where the bundle ID is the same for both builds
        if (app.bundleId === "com.exafunction.windsurf") {
          return app.path.toLowerCase().includes(`${normalizedBuildName.toLowerCase()}.app`);
        }

        return true;
      });
      if (app) return app;
    }
  } else {
    if (!bundleId) return undefined;
    const wantedName = bundleId.windows.name.toLowerCase();
    const wantedExe = bundleId.windows.exe.toLowerCase();
    const app = apps.find((app) => {
      if (app.name.toLowerCase() === wantedName) return true;

      const exeFromPath = path.win32.basename(app.path).toLowerCase();
      if (exeFromPath === wantedExe) return true;

      return false;
    });
    if (app) return app;
  }

  return undefined;
}
