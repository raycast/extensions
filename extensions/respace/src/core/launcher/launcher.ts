import { Toast, showHUD, showToast } from "@raycast/api";
import type {
  TrackedWindow,
  WorkspaceItem,
  WorkspaceItemType,
} from "../../types/workspace";
import { delay } from "../utils/delay";
import { AppLauncher } from "./strategies/app-launcher";
import type { ItemLaunchStrategy } from "./strategies/base-strategy";
import { FileLauncher } from "./strategies/file-launcher";
import { TerminalLauncher } from "./strategies/terminal-launcher";
import { UrlLauncher } from "./strategies/url-launcher";

// ============================================================================
// Constants & Setup
// ============================================================================

/**
 * Time to wait for apps to create windows after launch (in milliseconds).
 * Default is 1500ms, which works well for most desktop apps on modern hardware.
 * You can override this value by setting the environment variable RAYCAST_APP_INIT_DELAY_MS.
 * Increase this value if your apps need more time to initialize their windows.
 */
const APP_INIT_DELAY = process.env.RAYCAST_APP_INIT_DELAY_MS
  ? Number(process.env.RAYCAST_APP_INIT_DELAY_MS)
  : 1500;

const appLauncher = new AppLauncher();

const strategies = new Map<WorkspaceItemType, ItemLaunchStrategy>([
  ["app", appLauncher],
  ["file", new FileLauncher()],
  ["folder", new FileLauncher()],
  ["url", new UrlLauncher()],
  ["terminal", new TerminalLauncher()],
]);

// ============================================================================
// Utility Functions
// ============================================================================

/** Group items by a key function */
function groupBy<T, K>(items: T[], keyFn: (item: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const key = keyFn(item);
    const group = map.get(key) || [];
    group.push(item);
    map.set(key, group);
  }
  return map;
}

/** Launch a single item using the appropriate strategy */
async function launchItem(item: WorkspaceItem): Promise<TrackedWindow[]> {
  const strategy = strategies.get(item.type);
  if (!strategy) {
    throw new Error(`Unknown item type: ${item.type}`);
  }
  return strategy.launch(item);
}

/** Verify which tracked windows still exist */
export async function verifyAllWindows(
  windows: TrackedWindow[],
): Promise<TrackedWindow[]> {
  const windowsByType = groupBy(windows, (w) => w.type);
  const verified: TrackedWindow[] = [];

  for (const [type, typeWindows] of windowsByType) {
    const strategy = strategies.get(type);
    if (!strategy) continue;

    try {
      const stillExist = await strategy.verifyWindows(typeWindows);
      verified.push(...stillExist);
    } catch (error) {
      console.error(`Error verifying windows for type ${type}:`, error);
    }
  }

  return verified;
}

// ============================================================================
// App Launching (3-Phase Parallel)
// ============================================================================

/**
 * Launch a group of apps using 3-phase parallel approach:
 *   Phase 1: Capture before-state for ALL apps (parallel)
 *   Phase 2: Launch ALL apps (parallel)
 *   Phase 3: Capture after-state for ALL apps (parallel)
 */
async function launchAppGroup(apps: WorkspaceItem[]): Promise<TrackedWindow[]> {
  // Phase 1: Capture before-state
  console.log("Phase 1: Capturing before-state...");
  const beforeStates = await Promise.all(
    apps.map((item) =>
      appLauncher.captureBeforeState(item).catch((err) => {
        console.error(`Error capturing before-state for ${item.name}:`, err);
        return null;
      }),
    ),
  );

  // Phase 2: Launch all apps
  console.log("Phase 2: Launching all apps...");
  await Promise.all(
    apps.map((item) =>
      appLauncher.launchOnly(item).catch((err) => {
        console.error(`Error launching ${item.name}:`, err);
      }),
    ),
  );

  // Phase 3: Wait for initialization, then capture after-state
  console.log("Phase 3: Waiting for apps to initialize...");
  await delay(APP_INIT_DELAY);

  console.log("Phase 3: Capturing after-state...");
  const windowArrays = await Promise.all(
    beforeStates.map((state) => {
      if (!state) return Promise.resolve([]);
      return appLauncher.captureAfterState(state).catch((err) => {
        console.error("Error capturing after-state:", err);
        return [];
      });
    }),
  );

  return windowArrays.flat();
}

/** Launch non-app items (files, URLs, terminals) in parallel */
async function launchOtherItems(
  items: WorkspaceItem[],
): Promise<{ windows: TrackedWindow[]; errors: string[] }> {
  const results = await Promise.all(
    items.map(async (item) => {
      try {
        return { success: true as const, windows: await launchItem(item) };
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.error(`Error launching ${item.name}:`, error);
        return { success: false as const, error: errorMsg };
      }
    }),
  );

  const windows = results
    .filter((r) => r.success)
    .flatMap((r) => (r as { windows: TrackedWindow[] }).windows);
  const errors = results
    .filter((r) => !r.success)
    .map((r) => (r as { error: string }).error);

  return { windows, errors };
}

// ============================================================================
// Main Launch Function
// ============================================================================

/**
 * Launches all items in a workspace with parallel execution and window tracking.
 * Apps are launched in groups based on their delay settings.
 */
export async function launchWorkspace(
  items: WorkspaceItem[],
  workspaceName: string,
): Promise<TrackedWindow[]> {
  if (items.length === 0) {
    await showHUD("Workspace is empty");
    return [];
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Launching workspace...",
    message: workspaceName,
  });

  const trackedWindows: TrackedWindow[] = [];
  const errors: string[] = [];

  // Separate items by type
  const appItems = items.filter((item) => item.type === "app");
  const otherItems = items.filter((item) => item.type !== "app");

  // Group apps by delay value
  const appsByDelay = groupBy(appItems, (item) => item.delay || 0);
  const sortedDelays = Array.from(appsByDelay.keys()).sort((a, b) => a - b);

  console.log(
    `Launching ${appItems.length} apps in ${sortedDelays.length} groups + ${otherItems.length} other items`,
  );

  // Launch each delay group
  for (const delayMs of sortedDelays) {
    if (delayMs > 0) {
      console.log(`Waiting ${delayMs}ms...`);
      await delay(delayMs);
    }

    const group = appsByDelay.get(delayMs) || [];
    if (group.length === 0) continue;

    console.log(
      `\n=== Launching ${group.length} apps (delay: ${delayMs}ms) ===`,
    );

    try {
      const windows = await launchAppGroup(group);
      trackedWindows.push(...windows);
      toast.message = `${trackedWindows.length} items tracked`;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.error(`Error in delay group ${delayMs}:`, error);
    }
  }

  // Launch non-app items
  if (otherItems.length > 0) {
    console.log(`\n=== Launching ${otherItems.length} non-app items ===`);
    const result = await launchOtherItems(otherItems);
    trackedWindows.push(...result.windows);
    errors.push(...result.errors);
  }

  // Show result
  const successCount = items.length - errors.length;
  if (errors.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "Workspace launched successfully";
    toast.message = `All ${successCount} items opened`;
    await showHUD(`Opened ${successCount} items from "${workspaceName}"`);
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Workspace launched with errors";
    toast.message = `${successCount}/${items.length} items opened, ${errors.length} failed`;
    await showHUD(`${successCount}/${items.length} items opened. ${errors[0]}`);
  }

  console.log(`Collected ${trackedWindows.length} tracked windows`);
  return trackedWindows;
}

// ============================================================================
// Close Workspace
// ============================================================================

/** Closes all tracked windows from a workspace */
export async function closeWorkspace(
  windows: TrackedWindow[],
  workspaceName: string,
): Promise<void> {
  if (windows.length === 0) {
    await showHUD("No windows to close");
    return;
  }

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Closing workspace...",
    message: workspaceName,
  });

  // Verify which windows still exist
  const verifiedWindows = await verifyAllWindows(windows);

  if (verifiedWindows.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "Workspace already closed";
    toast.message = "All windows were already closed";
    await showHUD(`"${workspaceName}" was already closed`);
    return;
  }

  // Close windows grouped by type
  const windowsByType = groupBy(verifiedWindows, (w) => w.type);
  let closedCount = 0;
  const errors: string[] = [];

  for (const [type, typeWindows] of windowsByType) {
    const strategy = strategies.get(type);
    if (!strategy) continue;

    try {
      await strategy.close(typeWindows);
      closedCount += typeWindows.length;
      toast.message = `${closedCount}/${verifiedWindows.length} windows closed`;
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
      console.error(`Error closing windows for type ${type}:`, error);
    }
  }

  // Show result
  if (errors.length === 0) {
    toast.style = Toast.Style.Success;
    toast.title = "Workspace closed successfully";
    toast.message = `Closed ${closedCount} windows`;
    await showHUD(`Closed ${closedCount} windows from "${workspaceName}"`);
  } else {
    toast.style = Toast.Style.Failure;
    toast.title = "Workspace closed with errors";
    toast.message = `${closedCount}/${verifiedWindows.length} closed, ${errors.length} failed`;
    await showHUD(
      `${closedCount}/${verifiedWindows.length} windows closed. ${errors[0]}`,
    );
  }
}
