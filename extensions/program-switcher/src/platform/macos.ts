// macOS platform implementation (placeholder for future implementation)

import { exec } from "child_process";
import { promisify } from "util";
import { Icon, WindowManagement, showHUD, closeMainWindow } from "@raycast/api";
import { ProgramInfo, PlatformAdapter, FilterOption } from "./types";

const execAsync = promisify(exec);

export class MacOSPlatformAdapter implements PlatformAdapter {
  async checkNativeApiAccess(): Promise<boolean> {
    // TODO: Check if AppleScript/osascript is available
    // For now, assume it's always available on macOS
    return true;
  }

  async getProgramsNative(): Promise<ProgramInfo[]> {
    // TODO: Implement using AppleScript to get window list
    // Example: osascript -e 'tell application "System Events" to get name of every window of every process'

    throw new Error("macOS native implementation not yet available. Please use API mode.");
  }

  async getProgramsAPI(): Promise<ProgramInfo[]> {
    // Get windows from Raycast API (should work better on macOS)
    const apiWindows = await WindowManagement.getWindowsOnActiveDesktop();
    const activeWindow = await WindowManagement.getActiveWindow();

    return apiWindows
      .filter((w) => w.application?.name)
      .map(
        (w): ProgramInfo => ({
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

  async switchToProgram(programId: string, programTitle: string): Promise<void> {
    // TODO: Implement using AppleScript or WindowManagement API
    // For now, try using the API's setWindowBounds which might trigger focus

    try {
      const windows = await WindowManagement.getWindowsOnActiveDesktop();
      const targetWindow = windows.find((w) => w.id === programId);

      if (!targetWindow) {
        throw new Error(`Window with ID ${programId} not found`);
      }
      if (targetWindow.positionable) {
        await WindowManagement.setWindowBounds({
          id: targetWindow.id,
          bounds: { position: { x: 100, y: 100 } },
        });
      }

      await showHUD(`✅ Switched to ${programTitle}`);
      await closeMainWindow();
    } catch (err) {
      console.error("Error switching to program:", err);
      await showHUD(`❌ Failed to switch: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  async closeProgram(programId: string, programTitle: string): Promise<void> {
    try {
      const windows = await WindowManagement.getWindowsOnActiveDesktop();
      const targetWindow = windows.find((w) => w.id === programId);

      if (!targetWindow || !targetWindow.application) {
        throw new Error(`Window with ID ${programId} not found`);
      }

      // Use osascript to quit the application
      const appName = targetWindow.application.name;
      const command = `osascript -e 'tell application ${JSON.stringify(appName)} to quit'`;

      await execAsync(command);
      await showHUD(`✅ Closed ${programTitle}`);
    } catch (err) {
      await showHUD(`❌ Failed to close: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  async forceKillProgram(programId: string, programTitle: string): Promise<void> {
    try {
      const windows = await WindowManagement.getWindowsOnActiveDesktop();
      const targetWindow = windows.find((w) => w.id === programId);

      if (!targetWindow || !targetWindow.application) {
        throw new Error(`Window with ID ${programId} not found`);
      }

      // Use killall to force kill the application
      const appName = targetWindow.application.name;
      const command = `killall -9 ${JSON.stringify(appName)}`;

      await execAsync(command);
      await showHUD(`✅ Force killed ${programTitle}`);
    } catch (err) {
      await showHUD(`❌ Failed to force kill: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  getProgramIcon(program: ProgramInfo): { fileIcon: string } | string {
    // macOS: Use bundle path if available
    if (program.executablePath && program.executablePath !== "") {
      return { fileIcon: program.executablePath };
    }
    return Icon.Window;
  }

  getFilterOptions(): FilterOption[] | null {
    // macOS doesn't need monitor filtering (or implement if needed)
    return null;
  }
}
