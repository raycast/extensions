import { Application, getApplications } from "@raycast/api";

// Map of build names to bundle IDs
const bundleIdMap: Record<string, string> = {
  Code: "com.microsoft.VSCode",
  "Code - Insiders": "com.microsoft.VSCodeInsiders",
  VSCodium: "com.vscodium",
  "VSCodium - Insiders": "com.vscodium.VSCodiumInsiders",
  Cursor: "com.todesktop.230313mzl4w4u92",
  Windsurf: "com.exafunction.windsurf",
  Trae: "com.trae.app",
};

/**
 * Get the bundle ID for the specified build name
 * @param buildName The name of the build (e.g., "Code", "VSCodium", etc.)
 * @returns The bundle ID for the specified build
 */
export function getBundleId(buildName: string): string {
  return bundleIdMap[buildName] || "";
}

/**
 * Get the application for the specified build name
 * @param buildName The name of the build (e.g., "Code", "VSCodium", etc.)
 * @returns Promise resolving to the Application object or undefined if not found
 */
export async function getEditorApplication(buildName: string): Promise<Application | undefined> {
  const apps = await getApplications();

  // Find the app by bundle ID
  const bundleId = bundleIdMap[buildName];
  if (bundleId) {
    const app = apps.find((app) => app.bundleId === bundleId);
    if (app) return app;
  }

  return undefined;
}
