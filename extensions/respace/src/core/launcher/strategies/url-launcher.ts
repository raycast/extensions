import { open } from "@raycast/api";
import type { TrackedWindow, WorkspaceItem } from "../../../types/workspace";
import type { ItemLaunchStrategy } from "./base-strategy";

export class UrlLauncher implements ItemLaunchStrategy {
  async launch(item: WorkspaceItem): Promise<TrackedWindow[]> {
    try {
      await open(item.path);
      // URLs open in browser tabs which cannot be reliably tracked
      // Return empty array to indicate no trackable windows
      return [];
    } catch (error) {
      throw new Error(`Failed to launch ${item.name}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async close(): Promise<void> {
    // URLs can't be reliably closed - they're opened in browsers as tabs
    // Note: This is intentionally a no-op
  }

  async verifyWindows(): Promise<TrackedWindow[]> {
    // URLs can't be tracked, so return empty array
    return [];
  }
}
