import {
  launchWindow,
  launchTab,
  launchSplit,
  gotoLayout,
  sendText,
  focusWindow,
  ensureKittyRunning,
  activateKitty,
} from "./kitty-remote";
import type { LaunchConfig, PaneConfig } from "./types";

/**
 * Execute a full launch configuration: create windows, tabs, splits, and send commands.
 */
export async function executeLaunchConfig(config: LaunchConfig): Promise<void> {
  await ensureKittyRunning();

  for (const win of config.windows) {
    let isFirstTab = true;

    for (const tab of win.tabs) {
      if (isFirstTab) {
        // First tab: create a new OS window
        const windowId = launchWindow({ cwd: tab.layout.cwd, title: tab.title });
        isFirstTab = false;
        await executePane(tab.layout, windowId);
      } else {
        // Subsequent tabs: create a tab
        const windowId = launchTab({ cwd: tab.layout.cwd, title: tab.title });
        await executePane(tab.layout, windowId);
      }
    }
  }

  activateKitty();
}

async function executePane(pane: PaneConfig, windowId: number): Promise<void> {
  // If this pane has splits, set up the splits layout
  if (pane.panes && pane.panes.length > 0) {
    gotoLayout("splits");
    focusWindow(windowId);

    for (const subPane of pane.panes) {
      const direction = pane.split_direction === "horizontal" ? "hsplit" : "vsplit";
      const newWindowId = launchSplit(direction, { cwd: subPane.cwd });
      await executePane(subPane, newWindowId);
    }
  }

  // Send commands to this window
  if (pane.commands) {
    // Small delay to let the shell initialize
    await sleep(100);
    for (const cmd of pane.commands) {
      sendText(windowId, cmd.exec);
      await sleep(50);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
