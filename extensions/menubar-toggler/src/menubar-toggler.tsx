#!/usr/bin/env node
/**
 * menubar-toggler - Raycast Extension
 *
 * Control menu bar auto-hide settings using AppleScript
 */

import { execSync } from "child_process";

/**
 * Execute AppleScript command
 */
function runAppleScript(script: string): string {
  return execSync(`osascript -e '${script}'`, { encoding: "utf-8" }).trim();
}

/**
 * Get current menu bar auto-hide status
 */
function getMenuBarStatus(): boolean {
  const result = runAppleScript(`
    tell application "System Events"
      tell dock preferences to get autohide menu bar
    end tell
  `);
  return result === "true";
}

/**
 * Toggle menu bar auto-hide status
 */
function toggleMenuBar(): void {
  const current = getMenuBarStatus();
  runAppleScript(`
    tell application "System Events"
      tell dock preferences to set autohide menu bar to ${!current}
    end tell
  `);
}

/**
 * Get status message
 */
function getStatusMessage(enabled: boolean): string {
  return enabled
    ? "Menu Bar Auto-Hide: Enabled (menu bar hidden, appears on mouse hover to top)"
    : "Menu Bar Auto-Hide: Disabled (menu bar always visible)";
}

/**
 * Main execution
 */
export default function main(): void {
  toggleMenuBar();
  const newStatus = getMenuBarStatus();
  console.log(getStatusMessage(newStatus));
}
