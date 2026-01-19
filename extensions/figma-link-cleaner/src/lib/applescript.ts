/**
 * AppleScript utilities for interacting with macOS system events.
 * Used to send keystrokes to Figma and check frontmost app.
 */

import { execSync } from "child_process";

/**
 * Runs an AppleScript and returns the output.
 * @param script - The AppleScript code to execute
 * @returns The trimmed output from osascript
 * @throws Error if AppleScript execution fails
 */
export function runAppleScript(script: string): string {
  try {
    const result = execSync(
      `osascript -e '${script.replace(/'/g, "'\"'\"'")}'`,
      {
        encoding: "utf-8",
        timeout: 5000, // 5 second timeout
      },
    );
    return result.trim();
  } catch (error) {
    // Re-throw with more context
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`AppleScript failed: ${message}`);
  }
}

/**
 * Gets the name of the frontmost (active) application.
 * @returns The name of the frontmost app (e.g., "Figma")
 */
export function getFrontmostApp(): string {
  const script = `
    tell application "System Events"
      set frontApp to name of first process whose frontmost is true
    end tell
    return frontApp
  `;
  return runAppleScript(script);
}

/**
 * Checks if Figma is the frontmost application.
 * @returns true if Figma is in the foreground
 */
export function isFigmaFrontmost(): boolean {
  try {
    const frontApp = getFrontmostApp();
    // Check if app name contains "Figma" (handles "Figma" and "Figma Beta")
    return frontApp.toLowerCase().includes("figma");
  } catch {
    // If we can't determine the frontmost app, assume it's not Figma
    return false;
  }
}

/**
 * Sends Command+L keystroke to the frontmost application.
 * This triggers Figma's "Copy link" action when Figma is active.
 *
 * IMPORTANT: This requires Accessibility permissions for Raycast.
 * If permission is not granted, this will throw an error.
 */
export function sendCopyLinkKeystroke(): void {
  const script = `
    tell application "System Events"
      keystroke "l" using {command down}
    end tell
  `;

  try {
    runAppleScript(script);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Check if it's an accessibility permission error
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
