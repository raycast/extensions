// macOS platform implementation (placeholder for future implementation)

import { exec } from "child_process";
import { promisify } from "util";
import { Icon, WindowManagement, showHUD, closeMainWindow } from "@raycast/api";
import { AppInfo, PlatformAdapter, FilterOption } from "./types";

const execAsync = promisify(exec);

export class MacOSPlatformAdapter implements PlatformAdapter {
  async checkNativeApiAccess(): Promise<boolean> {
    // TODO: Check if AppleScript/osascript is available
    // For now, assume it's always available on macOS
    return true;
  }

  async getAppsNative(): Promise<AppInfo[]> {
    // TODO: Implement using AppleScript to get window list
    // Example: osascript -e 'tell application "System Events" to get name of every window of every process'

    throw new Error("macOS native implementation not yet available. Please use API mode.");
  }

  async getAppsAPI(): Promise<AppInfo[]> {
    // Get windows from Raycast API (should work better on macOS)
    const apiWindows = await WindowManagement.getWindowsOnActiveDesktop();
    const activeWindow = await WindowManagement.getActiveWindow();

    return apiWindows
      .filter((w) => w.application?.name)
      .map(
        (w): AppInfo => ({
          id: w.id,
          title: w.application?.name || "Untitled",
          appName: w.application?.name || "Unknown",
          bundleId: w.application?.bundleId,
          executablePath: w.application?.path,
          isActive: w.id === activeWindow.id,
          positionable: w.positionable,
          resizable: w.resizable,
        }),
      )
      .sort((a, b) => {
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        return a.appName.localeCompare(b.appName);
      });
  }

  async switchToApp(appId: string, appTitle: string): Promise<void> {
    // TODO: Implement using AppleScript or WindowManagement API
    // For now, try using the API's setWindowBounds which might trigger focus

    try {
      const windows = await WindowManagement.getWindowsOnActiveDesktop();
      const targetWindow = windows.find((w) => w.id === appId);

      if (!targetWindow) {
        throw new Error(`Window with ID ${appId} not found`);
      }
      if (targetWindow.positionable) {
        await WindowManagement.setWindowBounds({
          id: targetWindow.id,
          bounds: { position: { x: 100, y: 100 } },
        });
      }

      await showHUD(`✅ Switched to ${appTitle}`);
      await closeMainWindow();
    } catch (err) {
      console.error("Error switching to app:", err);
      await showHUD(`❌ Failed to switch: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  async closeApp(appId: string, appTitle: string): Promise<void> {
    try {
      const windows = await WindowManagement.getWindowsOnActiveDesktop();
      const targetWindow = windows.find((w) => w.id === appId);

      if (!targetWindow || !targetWindow.application) {
        throw new Error(`Window with ID ${appId} not found`);
      }

      // Use osascript to quit the application
      const appName = targetWindow.application.name;
      const command = `osascript -e 'tell application ${JSON.stringify(appName)} to quit'`;

      await execAsync(command);
      await showHUD(`✅ Closed ${appTitle}`);
    } catch (err) {
      await showHUD(`❌ Failed to close: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  getAppIcon(app: AppInfo): { fileIcon: string } | string {
    // macOS: Use bundle path if available
    if (app.executablePath && app.executablePath !== "") {
      return { fileIcon: app.executablePath };
    }
    return Icon.Window;
  }

  getFilterOptions(): FilterOption[] | null {
    // macOS doesn't need monitor filtering (or implement if needed)
    return null;
  }
}
