import { runAppleScript } from "@raycast/utils";

export interface DockTile {
  /** Dock tile name as shown in the Dock (usually the app name). */
  name: string;
  /** Raw badge label: a number such as "12" or "1,234", "•" for dot badges, or "" when there is no badge. */
  badge: string;
  /** Numeric badge value. Dot / non-numeric badges count as 1. */
  count: number;
  isRunning: boolean;
}

export class AccessibilityError extends Error {}

/** Whether an AppleScript failure means Raycast lacks the Accessibility grant. */
export function isAccessibilityError(error: unknown): boolean {
  if (error instanceof AccessibilityError) return true;
  const message = error instanceof Error ? error.message : String(error);
  // -25211 / -1719 / "not allowed assistive access" all indicate a missing Accessibility grant.
  return /assistive|accessibility|-25211|-1719|not allowed/i.test(message);
}

const SEP = "|~|"; // never appears in app names

// Reads every application tile in the Dock's list and its AXStatusLabel (the badge).
// Only AXApplicationDockItem tiles are emitted: the Handoff tile (AXHandoffDockItem) carries the
// source device's identifier, e.g. "com.apple.iphone-13-pro-1", in its status label, and folders,
// the separator and Trash never have badges.
// Works even when the Dock is auto-hidden. Requires Accessibility permission for Raycast.
const SCRIPT = `
set out to ""
tell application "System Events"
  tell process "Dock"
    repeat with e in UI elements of list 1
      set n to name of e
      set sub to ""
      try
        set sub to subrole of e
      end try
      if n is not missing value and sub is "AXApplicationDockItem" then
        set s to ""
        try
          set s to value of attribute "AXStatusLabel" of e
        end try
        if s is missing value then set s to ""
        set r to false
        try
          set r to value of attribute "AXIsApplicationRunning" of e
        end try
        if r is missing value then set r to false
        set out to out & n & "${SEP}" & s & "${SEP}" & r & linefeed
      end if
    end repeat
  end tell
end tell
return out
`;

export async function readDockTiles(): Promise<DockTile[]> {
  let raw: string;
  try {
    raw = await runAppleScript(SCRIPT, { timeout: 8000 });
  } catch (error) {
    if (isAccessibilityError(error)) {
      throw new AccessibilityError(error instanceof Error ? error.message : String(error));
    }
    throw error;
  }

  return raw
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name = "", badge = "", running = ""] = line.split(SEP);
      return {
        name,
        badge,
        count: badgeToCount(badge),
        isRunning: running === "true",
      };
    });
}

/**
 * Numeric value of a badge label. Only labels that are entirely a number (allowing locale grouping
 * separators such as "1,234" or "1.234") are parsed; anything else with a badge counts as 1, so a
 * label that merely contains digits is never misread as a count.
 */
export function badgeToCount(badge: string): number {
  const trimmed = badge.trim();
  if (!trimmed) return 0;
  if (/^\d[\d,.\s']*$/.test(trimmed)) return parseInt(trimmed.replace(/\D/g, ""), 10);
  return 1; // "•" or any other non-numeric badge
}

/** Whether macOS is in Dark appearance. Menu bar dropdowns follow this, not Raycast's own theme. */
export async function readSystemDarkMode(): Promise<boolean> {
  try {
    const out = await runAppleScript(
      'tell application "System Events" to tell appearance preferences to get dark mode',
      { timeout: 3000 },
    );
    return out.trim() === "true";
  } catch {
    return false;
  }
}

/** Clicks a Dock tile via Accessibility, activating whatever it represents. */
export async function clickDockTile(name: string): Promise<void> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  await runAppleScript(
    `tell application "System Events" to tell process "Dock" to click UI element "${escaped}" of list 1`,
    { timeout: 5000 },
  );
}
