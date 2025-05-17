import { promisify } from "node:util";
import { exec, execFile } from "node:child_process";
import { showToast, Toast } from "@raycast/api";
import { ENV, YABAI, YabaiSpace, YabaiWindow } from "./models";

const execFilePromise = promisify(execFile);
const execPromise = promisify(exec);

// Focus a window.
export const handleFocusWindow = (windowId: number, windowApp: string, onFocused: (id: number) => void) => {
  return async () => {
    await showToast({ style: Toast.Style.Animated, title: "Focusing Window..." });
    try {
      const { stderr } = await execFilePromise(YABAI, ["-m", "window", windowId.toString(), "--focus"], {
        env: ENV,
      });
      if (stderr?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Yabai Error - Focus Window",
          message: stderr.trim(),
        });
      } else {
        onFocused(windowId);
        await showToast({
          style: Toast.Style.Success,
          title: "Window Focused",
          message: `Window ${windowApp} focused`,
        });
      }
    } catch (error: Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Focus Window",
        message: error.message || "Unknown error while focusing window",
      });
    }
  };
};

// Close a window and remove it from the list.
export const handleCloseWindow = (windowId: number, windowApp: string, onRemove: (id: number) => void) => {
  return async () => {
    await showToast({ style: Toast.Style.Animated, title: "Closing Window..." });
    try {
      const { stderr } = await execFilePromise(YABAI, ["-m", "window", windowId.toString(), "--close"], {
        env: ENV,
      });
      if (stderr?.trim()) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Yabai Error - Close Window",
          message: stderr.trim(),
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Window Closed",
          message: `Window ${windowApp} closed`,
        });
        onRemove(windowId);
      }
    } catch (error: Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Close Window",
        message: error.message || "Unknown error while closing window",
      });
    }
  };
};

// Aggregate all windows with the same app name into an empty or newly created space.
export const handleAggregateToSpace = (windowId: number, windowApp: string) => {
  return async () => {
    await showToast({
      style: Toast.Style.Animated,
      title: "Aggregating Windows...",
    });
    try {
      // Step 1: Query the current window for its space.
      const currentWinResult = await execFilePromise(
        YABAI,
        ["-m", "query", "--windows", "--window", windowId.toString()],
        { env: ENV },
      );
      const currentWin: YabaiWindow = JSON.parse(currentWinResult.stdout);
      const currentSpace = currentWin.space;
      console.log("Current space:", currentSpace);

      // Step 2: Query all windows and count those in the current space.
      const allWinsResult = await execFilePromise(YABAI, ["-m", "query", "--windows"], { env: ENV });
      const allWindows: YabaiWindow[] = JSON.parse(allWinsResult.stdout);
      const windowsInCurrentSpace = allWindows.filter((w) => w.space === currentSpace);
      console.log("Windows in current space:", windowsInCurrentSpace.length);

      if (windowsInCurrentSpace.length < 2) {
        await showToast({
          style: Toast.Style.Success,
          title: "Nothing to Aggregate",
          message: "The current space contains only one window.",
        });
        return;
      }

      // Step 3: Find an empty space.
      const spacesResult = await execFilePromise(YABAI, ["-m", "query", "--spaces"], { env: ENV });
      const spaces: YabaiSpace[] = JSON.parse(spacesResult.stdout);
      let targetSpace = spaces.find((s) => Array.isArray(s.windows) && s.windows.length === 0);

      // Step 4: Create a new space if no empty one is found.
      if (!targetSpace) {
        const createResult = await execFilePromise(YABAI, ["-m", "space", "--create"], { env: ENV });
        console.log("Space creation output:", createResult.stdout);
        const spacesResultAfter = await execFilePromise(YABAI, ["-m", "query", "--spaces"], { env: ENV });
        const updatedSpaces: YabaiSpace[] = JSON.parse(spacesResultAfter.stdout);
        targetSpace = updatedSpaces.find((s) => Array.isArray(s.windows) && s.windows.length === 0);
      }

      if (!targetSpace) {
        await showToast({
          style: Toast.Style.Failure,
          title: "Aggregation Failed",
          message: "Could not find or create an empty space.",
        });
        return;
      }

      const targetSpaceId = targetSpace.index;
      console.log("Target space id:", targetSpaceId);

      // Step 5: Filter windows of the same app (case‑insensitive).
      const matchingWindows = allWindows.filter((w) => w.app.toLowerCase() === windowApp.toLowerCase());
      console.log(`Moving ${matchingWindows.length} windows for app '${windowApp}' to space ${targetSpaceId}.`);

      // Step 6: Move each matching window using the correct order of parameters.
      for (const win of matchingWindows) {
        try {
          const moveResult = await execFilePromise(
            YABAI,
            ["-m", "window", win.id.toString(), "--space", targetSpaceId.toString()],
            { env: ENV },
          );
          if (moveResult.stderr?.trim()) {
            console.error(`Error moving window ${win.id}: ${moveResult.stderr.trim()}`);
          } else {
            console.log(`Moved window ${win.id} to space ${targetSpaceId}.`);
          }
        } catch (innerError: Error) {
          console.error(`Exception while moving window ${win.id}: ${innerError.message}`);
        }
      }

      // Step 7: Focus the target space.
      await execFilePromise(YABAI, ["-m", "space", "--focus", targetSpaceId.toString()], { env: ENV });

      // Step 8: Focus one of the moved windows (here, the first one in the matching list).
      if (matchingWindows.length > 0) {
        const focusWindowId = matchingWindows[0].id;
        await execFilePromise(YABAI, ["-m", "window", focusWindowId.toString(), "--focus"], { env: ENV });
      }

      await showToast({
        style: Toast.Style.Success,
        title: "Aggregation Complete",
        message: `All "${windowApp}" windows have been moved to space ${targetSpaceId} and one has been focused.`,
      });
    } catch (error: Error) {
      console.error("Aggregation failed:", error);
      await showToast({
        style: Toast.Style.Failure,
        title: "Aggregation Failed",
        message: error.message || "An unknown error occurred during aggregation.",
      });
    }
  };
};

export const handleCloseEmptySpaces = (windowId: number, onRemove: (id: number) => void) => {
  return async () => {
    await showToast({ style: Toast.Style.Animated, title: "Closing Empty Spaces..." });
    try {
      const command = `${YABAI} -m query --spaces | jq '.[] | select(.windows | length == 0) | .index' | xargs -I {} ${YABAI} -m space {} --destroy`;
      const { stderr } = await execPromise(command, { env: ENV });
      if (stderr?.trim()) {
        console.error(stderr);
        await showToast({
          style: Toast.Style.Failure,
          title: "Yabai Error - Close Empty Spaces",
          message: stderr.trim(),
        });
      } else {
        await showToast({
          style: Toast.Style.Success,
          title: "Spaces Closed",
          message: "Empty spaces closed",
        });
        onRemove(windowId);
      }
    } catch (error: Error) {
      await showToast({
        style: Toast.Style.Failure,
        title: "Failed to Close Empty Spaces",
        message: error.message || "Unknown error while closing window",
      });
    }
  };
};
