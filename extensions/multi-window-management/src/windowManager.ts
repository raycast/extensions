import { runAppleScript } from "@raycast/utils";
import { WindowInfo } from "./types";

/**
 * Get all open windows across all running applications.
 * Only returns windows that are currently visible (not minimized).
 * Uses System Events to query windows directly - this sees ALL windows
 * that are displayed on screen, including Docker, Cursor, VS Code, Notes, etc.
 */
export async function getOpenWindows(): Promise<WindowInfo[]> {
  const script = `
    tell application "System Events"
      set windowList to ""
      set allProcs to every process whose visible is true and background only is false
      repeat with proc in allProcs
        try
          set procName to name of proc
          set procBundle to bundle identifier of proc
          set procWindows to every window of proc
          repeat with w in procWindows
            try
              set winTitle to name of w
              -- Only include windows that are not minimized
              set isMinimized to false
              try
                set isMinimized to value of attribute "AXMinimized" of w
              end try
              if winTitle is not "" and winTitle is not missing value and isMinimized is false then
                set windowList to windowList & procName & "|||" & winTitle & "|||" & procBundle & "\\n"
              end if
            end try
          end repeat
        end try
      end repeat
      return windowList
    end tell
  `;

  try {
    const result = await runAppleScript(script);
    const lines = result
      .trim()
      .split("\n")
      .filter((l: string) => l.length > 0);

    const windows: WindowInfo[] = [];
    for (const line of lines) {
      const parts = line.split("|||");
      if (parts.length >= 3) {
        const appName = parts[0].trim();
        const windowTitle = parts[1].trim();
        const bundleId = parts[2].trim();

        // Skip Raycast itself
        if (bundleId === "com.raycast.macos") continue;

        windows.push({
          appName,
          windowTitle,
          windowId: `${appName}::${windowTitle}`,
          bundleId,
        });
      }
    }

    return windows;
  } catch (error) {
    console.error("Error getting open windows:", error);
    return [];
  }
}

/**
 * Minimize all visible windows (except Raycast).
 * Each window is individually minimized so they go to the dock.
 */
export async function minimizeAllWindows(): Promise<void> {
  const script = `
    tell application "System Events"
      set allProcs to every process whose visible is true and background only is false
      repeat with proc in allProcs
        try
          set procBundle to bundle identifier of proc
          if procBundle is not "com.raycast.macos" then
            set procWindows to every window of proc
            repeat with w in procWindows
              try
                set isMinimized to false
                try
                  set isMinimized to value of attribute "AXMinimized" of w
                end try
                if isMinimized is false then
                  set value of attribute "AXMinimized" of w to true
                end if
              end try
            end repeat
          end if
        end try
      end repeat
    end tell
  `;

  try {
    await runAppleScript(script);
  } catch (error) {
    console.error("Error minimizing all windows:", error);
    throw error;
  }
}

/**
 * Minimize all visible windows EXCEPT the ones in the given list.
 * This is used when switching to a group - minimize everything else.
 */
export async function minimizeAllExcept(keepWindows: WindowInfo[]): Promise<void> {
  // Build a list of window identifiers to keep
  const keepSet = keepWindows.map((w) => `${w.appName}|||${w.windowTitle}`);
  const keepListStr = keepSet.map((k) => `"${k.replace(/"/g, '\\"')}"`).join(", ");

  const script = `
    tell application "System Events"
      set keepList to {${keepListStr}}
      set allProcs to every process whose visible is true and background only is false
      repeat with proc in allProcs
        try
          set procName to name of proc
          set procBundle to bundle identifier of proc
          if procBundle is not "com.raycast.macos" then
            set procWindows to every window of proc
            repeat with w in procWindows
              try
                set winTitle to name of w
                set winKey to procName & "|||" & winTitle
                set shouldKeep to false
                repeat with k in keepList
                  if k as text is equal to winKey then
                    set shouldKeep to true
                    exit repeat
                  end if
                end repeat
                if shouldKeep is false then
                  set isMinimized to false
                  try
                    set isMinimized to value of attribute "AXMinimized" of w
                  end try
                  if isMinimized is false then
                    set value of attribute "AXMinimized" of w to true
                  end if
                end if
              end try
            end repeat
          end if
        end try
      end repeat
    end tell
  `;

  try {
    await runAppleScript(script);
  } catch (error) {
    console.error("Error minimizing windows:", error);
    throw error;
  }
}

/**
 * Unminimize (restore) specific windows and bring them to front.
 */
export async function restoreWindows(savedWindows: WindowInfo[]): Promise<{ shown: number; notFound: WindowInfo[] }> {
  const notFound: WindowInfo[] = [];
  let shown = 0;

  // Deduplicate by app name to make apps visible first
  const uniqueApps = [...new Set(savedWindows.map((w) => w.appName))];

  // First, ensure all target apps are visible
  for (const appName of uniqueApps) {
    const escapedApp = appName.replace(/"/g, '\\"');
    try {
      await runAppleScript(`
        tell application "System Events"
          try
            set visible of process "${escapedApp}" to true
          end try
        end tell
      `);
    } catch {
      // App might not be running
    }
  }

  // Then unminimize and raise each specific window
  for (const window of savedWindows) {
    const escapedApp = window.appName.replace(/"/g, '\\"');
    const escapedTitle = window.windowTitle.replace(/"/g, '\\"');

    try {
      const result = await runAppleScript(`
        tell application "System Events"
          tell process "${escapedApp}"
            set frontmost to true
            try
              set targetWindow to first window whose name is "${escapedTitle}"
              -- Unminimize if minimized
              try
                set isMinimized to value of attribute "AXMinimized" of targetWindow
                if isMinimized is true then
                  set value of attribute "AXMinimized" of targetWindow to false
                end if
              end try
              -- Raise the window
              perform action "AXRaise" of targetWindow
              return "found"
            on error
              return "notfound"
            end try
          end tell
        end tell
      `);
      if (result.trim() === "found") {
        shown++;
      } else {
        notFound.push(window);
      }
    } catch {
      notFound.push(window);
    }
  }

  return { shown, notFound };
}

/**
 * Restore all minimized windows (show everything).
 */
export async function restoreAllWindows(): Promise<void> {
  const script = `
    tell application "System Events"
      set allProcs to every process whose background only is false
      repeat with proc in allProcs
        try
          set procBundle to bundle identifier of proc
          if procBundle is not "com.raycast.macos" then
            set visible of proc to true
            set procWindows to every window of proc
            repeat with w in procWindows
              try
                set isMinimized to value of attribute "AXMinimized" of w
                if isMinimized is true then
                  set value of attribute "AXMinimized" of w to false
                end if
              end try
            end repeat
          end if
        end try
      end repeat
    end tell
  `;

  try {
    await runAppleScript(script);
  } catch (error) {
    console.error("Error restoring all windows:", error);
    throw error;
  }
}

/**
 * Check if an app is currently running.
 */
export async function isAppRunning(appName: string): Promise<boolean> {
  const escapedApp = appName.replace(/"/g, '\\"');
  try {
    const result = await runAppleScript(`
      tell application "System Events"
        return (exists process "${escapedApp}")
      end tell
    `);
    return result.trim() === "true";
  } catch {
    return false;
  }
}
