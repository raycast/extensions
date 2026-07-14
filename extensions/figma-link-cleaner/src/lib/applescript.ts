/**
 * AppleScript utilities for interacting with macOS system events.
 * Used to send keystrokes to Figma and check frontmost app.
 */

import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

/**
 * Runs an AppleScript asynchronously to avoid blocking the event loop.
 * @param script - The AppleScript code to execute
 * @returns The trimmed output from osascript
 * @throws Error if AppleScript execution fails
 */
export async function runAppleScript(script: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync("osascript", ["-e", script], {
      encoding: "utf-8",
      timeout: 10000, // 10 second timeout (scripts with delays need more time)
      maxBuffer: 1024 * 1024,
    });
    return stdout.trim();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AppleScript failed: ${message}`);
  }
}

/**
 * Gets the name of the frontmost (active) application.
 * @returns The name of the frontmost app (e.g., "Figma")
 */
export async function getFrontmostApp(): Promise<string> {
  return runAppleScript(`
    tell application "System Events"
      set frontApp to name of first process whose frontmost is true
    end tell
    return frontApp
  `);
}

/**
 * Checks if Figma is the frontmost application.
 * @returns true if Figma is in the foreground
 */
export async function isFigmaFrontmost(): Promise<boolean> {
  try {
    const frontApp = await getFrontmostApp();
    return frontApp.toLowerCase().includes("figma");
  } catch {
    return false;
  }
}

/**
 * Checks if Figma is currently running (even if not frontmost).
 * @returns true if Figma is running
 */
export async function isFigmaRunning(): Promise<boolean> {
  try {
    const count = await runAppleScript(`
      tell application "System Events"
        set figmaProcesses to (name of every process whose name contains "Figma")
      end tell
      return (count of figmaProcesses) as text
    `);
    return parseInt(count, 10) > 0;
  } catch {
    return false;
  }
}

/**
 * Brings Figma to the front and waits briefly for it to activate.
 */
export async function focusFigma(): Promise<void> {
  await runAppleScript(`
    tell application "System Events"
      set figmaProcess to first process whose name contains "Figma"
      set frontmost of figmaProcess to true
    end tell
  `);
}

/**
 * Gets the name of the running Figma process (handles "Figma" and "Figma Beta").
 * @returns The exact process name, or null if not running
 */
export async function getFigmaProcessName(): Promise<string | null> {
  try {
    return await runAppleScript(`
      tell application "System Events"
        set figmaProcess to first process whose name contains "Figma"
        return name of figmaProcess
      end tell
    `);
  } catch {
    return null;
  }
}

/**
 * Focuses Figma and sends Cmd+L in a single AppleScript.
 *
 * This is the bulletproof version:
 * 1. Activates Figma using "tell application" (proper macOS app activation)
 * 2. Waits in a loop until Figma is confirmed as the frontmost app
 * 3. Only then sends the Cmd+L keystroke
 *
 * This handles the race condition where Raycast might briefly steal focus back.
 */
export async function focusFigmaAndCopyLink(): Promise<void> {
  const figmaName = await getFigmaProcessName();
  if (!figmaName) {
    throw new Error("Figma is not running");
  }

  try {
    await runAppleScript(`
      -- Activate Figma
      tell application "${figmaName}" to activate

      -- Wait until Figma is confirmed frontmost (up to 3 seconds)
      tell application "System Events"
        set maxWait to 30
        set waited to 0
        repeat while waited < maxWait
          set frontApp to name of first process whose frontmost is true
          if frontApp contains "Figma" then exit repeat
          delay 0.1
          set waited to waited + 1
        end repeat

        -- Extra settle time for Figma to be fully ready
        delay 0.3

        -- Now send Cmd+L
        keystroke "l" using {command down}
      end tell
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("not allowed") ||
      message.includes("assistive access") ||
      message.includes("accessibility") ||
      message.includes("System Events")
    ) {
      throw new AccessibilityPermissionError();
    }

    throw error;
  }
}

/**
 * Sends Command+L keystroke to the frontmost application.
 * This triggers Figma's "Copy link" action when Figma is active.
 *
 * IMPORTANT: This requires Accessibility permissions for Raycast.
 * If permission is not granted, this will throw an error.
 */
export async function sendCopyLinkKeystroke(): Promise<void> {
  try {
    await runAppleScript(`
      tell application "System Events"
        keystroke "l" using {command down}
      end tell
    `);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    if (
      message.includes("not allowed") ||
      message.includes("assistive access") ||
      message.includes("accessibility") ||
      message.includes("System Events")
    ) {
      throw new AccessibilityPermissionError();
    }

    throw error;
  }
}

/**
 * Custom error for when Accessibility permissions are not granted.
 */
export class AccessibilityPermissionError extends Error {
  constructor() {
    super(
      "Accessibility permission required. Enable it in: System Settings → Privacy & Security → Accessibility → Raycast",
    );
    this.name = "AccessibilityPermissionError";
  }
}

/**
 * Waits for a specified duration.
 * @param ms - Milliseconds to wait
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
