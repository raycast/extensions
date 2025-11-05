// Windows platform implementation

import { exec } from "child_process";
import { promisify } from "util";
import { join } from "path";
import { Icon, WindowManagement, showHUD, closeMainWindow } from "@raycast/api";
import { ProgramInfo, PlatformAdapter, FilterOption } from "./types";

function parsePowerShellJson(jsonLine: string): Record<string, unknown>[] {
  try {
    return JSON.parse(jsonLine) as Record<string, unknown>[];
  } catch (error) {
    console.error("Failed to parse PowerShell JSON output:", jsonLine);
    throw new Error(`Invalid JSON from PowerShell: ${error}`);
  }
}

const execAsync = promisify(exec);

// Optimize exec with larger buffer and performance settings
const execAsyncOptimized = (command: string) =>
  execAsync(command, {
    maxBuffer: 1024 * 1024 * 10, // 10MB buffer (prevent truncation)
    windowsHide: true, // Don't flash console window
    encoding: "utf8", // Explicit UTF-8 encoding
  });

export class WindowsPlatformAdapter implements PlatformAdapter {
  private static readonly SCRIPTS_DIR = join(__dirname, "assets", "windows");

  async checkNativeApiAccess(): Promise<boolean> {
    // Check if PowerShell is available (should always be true on Windows)
    try {
      await execAsync("powershell -Command \"Write-Output 'test'\"");
      return true;
    } catch {
      return false;
    }
  }

  async getProgramsNative(options?: Record<string, unknown>): Promise<ProgramInfo[]> {
    const showAllMonitors = options?.showAllMonitors ?? false;

    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "enum-windows.ps1");
    const allMonitorsFlag = showAllMonitors ? "-AllMonitors" : "";

    const command =
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" ${allMonitorsFlag}`.trim();
    const { stdout } = await execAsyncOptimized(command);

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
      .sort((a: ProgramInfo, b: ProgramInfo) => {
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        return a.appName.localeCompare(b.appName);
      });
  }

  async getProgramsAPI(): Promise<ProgramInfo[]> {
    // Get windows from Raycast API
    const apiWindows = await WindowManagement.getWindowsOnActiveDesktop();
    const activeWindow = await WindowManagement.getActiveWindow();

    // Also get program info from PowerShell (has actual window titles)
    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "enum-windows.ps1");
    const { stdout } = await execAsyncOptimized(
      `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}"`,
    );

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
        } as ProgramInfo;
      })
      .sort((a, b) => {
        if (a.isActive) return -1;
        if (b.isActive) return 1;
        return a.appName.localeCompare(b.appName);
      });
  }

  async switchToProgram(programId: string, programTitle: string): Promise<void> {
    // Convert program ID to decimal handle for PowerShell
    // API mode: hex format (0x1234), PowerShell mode: already decimal
    const handle = programId.startsWith("0x") ? parseInt(programId, 16).toString() : programId;

    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "switch-window.ps1");
    const command = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -handle ${handle}`;

    await execAsyncOptimized(command);
    await showHUD(`✅ Switched to ${programTitle}`);
    await closeMainWindow();
  }

  async closeProgram(programId: string, programTitle: string): Promise<void> {
    const handle = programId.startsWith("0x") ? parseInt(programId, 16).toString() : programId;
    const scriptPath = join(WindowsPlatformAdapter.SCRIPTS_DIR, "close-window.ps1");
    const command = `powershell -NoProfile -NonInteractive -ExecutionPolicy Bypass -File "${scriptPath}" -handle ${handle}`;
    await execAsyncOptimized(command);
    await showHUD(`Closed ${programTitle}`);
  }

  getProgramIcon(program: ProgramInfo): { fileIcon: string } | string {
    // Use executable path for icon if available
    if (program.executablePath && program.executablePath !== "") {
      return { fileIcon: program.executablePath };
    }
    return Icon.Window;
  }

  getFilterOptions(preferredFirst?: string): FilterOption[] {
    // Windows supports desktop filtering
    const allOption = { label: "All Desktops", value: "all", tooltip: "Show programs from all desktops" };
    const visibleOption = {
      label: "Current Desktop Only",
      value: "active",
      tooltip: "Show programs from current desktop only",
    };

    // Put preferred option first to work around Raycast dropdown bug (resets to first option)
    if (preferredFirst === "active") {
      return [visibleOption, allOption];
    }
    return [allOption, visibleOption];
  }
}
