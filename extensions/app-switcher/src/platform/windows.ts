// Windows platform implementation

import { join } from "path";
import { Icon, WindowManagement, showHUD, closeMainWindow, showToast, Toast } from "@raycast/api";
import { AppInfo, PlatformAdapter, FilterOption } from "./types";
import PowerShellManager from "./PowerShellManager";

function parsePowerShellJson(jsonLine: string): Record<string, unknown>[] {
  try {
    return JSON.parse(jsonLine) as Record<string, unknown>[];
  } catch (error) {
    console.error("Failed to parse PowerShell JSON output:", jsonLine);
    throw new Error(`Invalid JSON from PowerShell: ${error}`);
  }
}

const psManager = PowerShellManager.getInstance();

export class WindowsPlatformAdapter implements PlatformAdapter {
  private static readonly SCRIPTS_DIR = join(__dirname, "assets", "windows");

  async checkNativeApiAccess(): Promise<boolean> {
    // Check if PowerShell is available (should always be true on Windows)
    try {
      const psManager = PowerShellManager.getInstance();
      await psManager.runScript("Write-Output 'test'");
      return true;
    } catch {
      return false;
    }
  }

  async getAppsNative(options?: Record<string, unknown>): Promise<AppInfo[]> {
    const showAllMonitors = options?.showAllMonitors ?? false;

    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "enum-windows.ps1");
    const allMonitorsFlag = showAllMonitors ? "-AllMonitors" : "";

    const args = allMonitorsFlag ? [allMonitorsFlag] : [];
    const stdout = await psManager.runScript(scriptPath, args);
    // Find the JSON output (should be the last non-empty line)
    const lines = stdout.trim().split("\n");
    const jsonLine = lines[lines.length - 1].trim();

    // Parse JSON with error handling
    const psWindows = parsePowerShellJson(jsonLine);

    return psWindows
      .map((psWin: Record<string, unknown>) => ({
        id: String(psWin.handle),
        title: String(psWin.title),
        appName: String(psWin.processName),
        executablePath: String(psWin.executablePath),
        isActive: Boolean(psWin.isActive),
        positionable: true,
        resizable: true,
      }))
      .sort((a: AppInfo, b: AppInfo) => {
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        return a.appName.localeCompare(b.appName);
      });
  }

  async getAppsAPI(): Promise<AppInfo[]> {
    // Get windows from Raycast API
    const apiWindows = await WindowManagement.getWindowsOnActiveDesktop();
    const activeWindow = await WindowManagement.getActiveWindow();

    // Also get application info from PowerShell (has actual window titles)
    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "enum-windows.ps1");
    const stdout = await psManager.runScript(scriptPath);

    // Find the JSON output (should be the last non-empty line)
    const lines = stdout.trim().split("\n");
    const jsonLine = lines[lines.length - 1].trim();

    // Parse JSON with error handling
    const psWindows = parsePowerShellJson(jsonLine);

    // Create a map of handle to title from PowerShell
    const titleMap = new Map<string, string>();
    psWindows.forEach((psWin: Record<string, unknown>) => {
      titleMap.set(String(psWin.handle), String(psWin.title));
    });

    // Combine: Use API windows but enrich with PowerShell titles
    return apiWindows
      .filter((w) => w.application?.name)
      .map((w) => {
        // Convert hex ID to decimal to match PowerShell handles
        const decimalHandle = parseInt(w.id, 16).toString();
        const psTitle = titleMap.get(decimalHandle);

        return {
          id: w.id,
          title: psTitle || w.application?.name || "Untitled",
          appName: w.application?.name || "Unknown",
          bundleId: w.application?.bundleId,
          executablePath: w.application?.path,
          isActive: w.id === activeWindow.id,
          positionable: w.positionable,
          resizable: w.resizable,
        } as AppInfo;
      })
      .sort((a, b) => {
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        return a.appName.localeCompare(b.appName);
      });
  }

  async switchToApp(appId: string, appTitle: string): Promise<void> {
    // Convert program ID to decimal handle for PowerShell
    // API mode: hex format (0x1234), PowerShell mode: already decimal
    const handle = appId.startsWith("0x") ? parseInt(appId, 16).toString() : appId;

    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "switch-window.ps1");
    try {
      const result = await psManager.runScript(scriptPath, ["-handle", handle]);
      // PowerShell script exits with 0 on success, 1 on failure
      if (result.includes("Window handle is not valid") || result.includes("exit 1")) {
        await showHUD(`❌ Failed to switch to ${appTitle}: Invalid handle or window not found.`);
        throw new Error(`Failed to switch: ${result}`);
      }
      await showHUD(`✅ Switched to ${appTitle}`);
      await closeMainWindow();
    } catch (err) {
      await showHUD(`❌ Failed to switch to ${appTitle}: ${err instanceof Error ? err.message : String(err)}`);
      throw err;
    }
  }

  async closeApp(appId: string, appTitle: string): Promise<void> {
    const handle = appId.startsWith("0x") ? parseInt(appId, 16).toString() : appId;
    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "close-window.ps1");
    await psManager.runScript(scriptPath, ["-handle", handle]);
    await showToast({
      style: Toast.Style.Success,
      title: "Success",
      message: `Closed ${appTitle}`,
    });
  }

  getAppIcon(app: AppInfo): { fileIcon: string } | string {
    // Use executable path for icon if available
    if (app.executablePath && app.executablePath !== "") {
      return { fileIcon: app.executablePath };
    }
    return Icon.Window;
  }

  getFilterOptions(preferredFirst?: string): FilterOption[] {
    // Windows supports desktop filtering
    const allOption = { label: "All Desktops", value: "all", tooltip: "Show apps from all desktops" };
    const visibleOption = {
      label: "Current Desktop Only",
      value: "active",
      tooltip: "Show apps from current desktop only",
    };

    // Put preferred option first to work around Raycast dropdown bug (resets to first option)
    if (preferredFirst === "active") {
      return [visibleOption, allOption];
    }
    return [allOption, visibleOption];
  }
}
