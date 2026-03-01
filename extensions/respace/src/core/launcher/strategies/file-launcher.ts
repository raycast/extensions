import { exec } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { promisify } from "node:util";
import { open } from "@raycast/api";
import type { TrackedWindow, WorkspaceItem } from "../../../types/workspace";
import { delay } from "../../utils/delay";
import type { ItemLaunchStrategy } from "./base-strategy";

const execAsync = promisify(exec);

export class FileLauncher implements ItemLaunchStrategy {
  private async getFinderWindowIds(): Promise<number[]> {
    try {
      const { stdout } = await execAsync(`osascript -e 'tell application "Finder" to get id of every window'`);
      if (!stdout.trim()) return [];

      return stdout
        .trim()
        .split(", ")
        .map((id) => Number.parseInt(id.trim(), 10))
        .filter((id) => !Number.isNaN(id));
    } catch {
      return [];
    }
  }

  async launch(item: WorkspaceItem): Promise<TrackedWindow[]> {
    try {
      if (!existsSync(item.path)) {
        throw new Error(`Path does not exist: ${item.path}`);
      }

      const beforeIds = await this.getFinderWindowIds();

      await open(item.path);
      // Wait 1500ms for Finder window to appear (file operations can be slower than apps)
      await delay(1500);

      const afterIds = await this.getFinderWindowIds();
      const newWindowIds = afterIds.filter((id) => !beforeIds.includes(id));

      return newWindowIds.map((windowId) => ({
        id: randomUUID(),
        systemWindowId: windowId,
        itemId: item.id,
        appName: "Finder",
        windowTitle: item.name,
        type: item.type,
        trackingMode: "window" as const,
        launchedAt: Date.now(),
      }));
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(windows: TrackedWindow[]): Promise<void> {
    for (const window of windows) {
      if (typeof window.systemWindowId !== "number" || !Number.isFinite(window.systemWindowId)) {
        continue;
      }
      try {
        await execAsync(
          `osascript -e 'tell application "Finder" to close window id ${window.systemWindowId}' 2>/dev/null || true`,
        );
      } catch {
        // Silently ignore - window might already be closed
      }
    }
  }

  async verifyWindows(windows: TrackedWindow[]): Promise<TrackedWindow[]> {
    try {
      const currentIds = await this.getFinderWindowIds();
      return windows.filter((window) => currentIds.includes(window.systemWindowId));
    } catch {
      return [];
    }
  }
}
