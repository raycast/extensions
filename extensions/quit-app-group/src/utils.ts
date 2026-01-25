import { runAppleScript } from "@raycast/utils";
import { SavedApp } from "./types";

export async function closeApps(apps: SavedApp[]): Promise<{ failedApps: string[] }> {
  const failedApps: string[] = [];

  for (const app of apps) {
    try {
      // Use AppleScript to quit the app by bundle ID
      // We use 'ignoring application responses' to avoid waiting if the app prompts for save
      // This ensures the command returns immediately and moves to the next app.
      // Escape double quotes and backslashes in bundleId to prevent AppleScript injection
      const safeBundleId = app.bundleId.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
      await runAppleScript(`
        try
          ignoring application responses
            tell application id "${safeBundleId}" to quit
          end ignoring
        on error
          return "error"
        end try
      `);
    } catch (error) {
      const errorMessage = String(error);
      // Ignore error -1728 (errAENoSuchObject): Application not found/invalid
      if (errorMessage.includes("-1728") || errorMessage.includes("不能获得")) {
        continue;
      }
      console.error(`Failed to close ${app.name}`, error);
      failedApps.push(app.name);
    }
  }

  return { failedApps };
}
