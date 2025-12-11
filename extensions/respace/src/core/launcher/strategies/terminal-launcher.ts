import { exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { promisify } from "node:util";
import type { TrackedWindow, WorkspaceItem } from "../../../types/workspace";
import { delay, escapeForShell } from "../../utils/delay";
import type { ItemLaunchStrategy } from "./base-strategy";

const execAsync = promisify(exec);

export class TerminalLauncher implements ItemLaunchStrategy {
  /**
   * Gets Terminal window IDs
   */
  private async getTerminalWindowIds(): Promise<number[]> {
    try {
      const script = `
        tell application "Terminal"
          get id of every window
        end tell
      `;
      const { stdout } = await execAsync(
        `osascript -e '${escapeForShell(script)}' 2>/dev/null || echo ""`,
      );
      const trimmed = stdout.trim();
      if (!trimmed) return [];

      return trimmed
        .split(", ")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
    } catch (error) {
      console.error("Error getting Terminal window IDs:", error);
      return [];
    }
  }

  async launch(item: WorkspaceItem): Promise<TrackedWindow[]> {
    try {
      // Get Terminal windows before launching
      const beforeIds = await this.getTerminalWindowIds();

      const script = `
        on run argv
          tell application "Terminal"
            activate
            do script (item 1 of argv as text)
          end tell
        end run
      `;
      const escapedScript = escapeForShell(script);
      await execAsync(
        `osascript -e '${escapedScript}' '${escapeForShell(item.path)}'`,
      );

      // Wait 500ms for Terminal window to appear (allows time for window creation and registration)
      await delay(500);

      // Get Terminal windows after launching
      const afterIds = await this.getTerminalWindowIds();

      // Find new windows
      const newWindowIds = afterIds.filter((id) => !beforeIds.includes(id));

      return newWindowIds.map((windowId) => ({
        id: randomUUID(),
        systemWindowId: windowId,
        itemId: item.id,
        appName: "Terminal",
        windowTitle: item.name,
        type: item.type,
        trackingMode: "window" as const,
        launchedAt: Date.now(),
      }));
    } catch (error) {
      throw new Error(
        `Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  async close(windows: TrackedWindow[]): Promise<void> {
    for (const window of windows) {
      if (
        typeof window.systemWindowId !== "number" ||
        !Number.isFinite(window.systemWindowId)
      ) {
        continue;
      }
      try {
        // Close the specific Terminal window
        const script = `
          tell application "Terminal"
            set windowList to every window
            repeat with w in windowList
              if id of w is ${window.systemWindowId} then
                close w
                return
              end if
            end repeat
          end tell
        `;
        await execAsync(
          `osascript -e '${escapeForShell(script)}' 2>/dev/null || true`,
        );
      } catch (error) {
        // Silently fail - the window might already be closed
        console.error(
          `Failed to close Terminal window ${window.systemWindowId}:`,
          error,
        );
      }
    }
  }

  async verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]> {
    try {
      const currentIds = await this.getTerminalWindowIds();
      return windows.filter((window) =>
        currentIds.includes(window.systemWindowId),
      );
    } catch (error) {
      console.error("Error verifying Terminal windows:", error);
      return [];
    }
  }
}
