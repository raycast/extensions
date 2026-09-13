import { Cache, launchCommand, LaunchType } from "@raycast/api";

const cache = new Cache();

/**
 * Clear cached flight data and relaunch the menu bar command so it reflects the
 * change immediately.
 *
 * Must be awaited while the calling command is still active — launching during
 * teardown (after showHUD/popToRoot) races with the command being dismissed and
 * the relaunch can be dropped, leaving the menu bar stale until the next
 * interval. Call this before showing a HUD.
 */
export async function refreshMenuBar(): Promise<void> {
  cache.clear();
  try {
    await launchCommand({
      name: "flight-status",
      type: LaunchType.Background,
    });
  } catch {
    // Menu bar command not launchable yet (e.g. first run) — its 5-minute
    // interval will pick up the change.
  }
}
