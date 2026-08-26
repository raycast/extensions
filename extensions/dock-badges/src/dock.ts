import { runAppleScript } from "@raycast/utils";

export interface DockTile {
  /** Dock tile name as shown in the Dock (usually the app name). */
  name: string;
  /** Raw badge label: digits, "•" for dot badges, or "" when there is no badge. */
  badge: string;
  /** Numeric badge value. Dot / non-numeric badges count as 1. */
  count: number;
  isRunning: boolean;
}

export class AccessibilityError extends Error {}

const SEP = "|~|"; // never appears in app names

// Reads every tile in the Dock's application list and its AXStatusLabel (the badge).
// Works even when the Dock is auto-hidden. Requires Accessibility permission for Raycast.
const SCRIPT = `
set out to ""
tell application "System Events"
  tell process "Dock"
    repeat with e in UI elements of list 1
      set n to name of e
      if n is not missing value then
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
    const message = error instanceof Error ? error.message : String(error);
    // -25211 / -1719 / "not allowed assistive access" all indicate a missing Accessibility grant.
    if (/assistive|accessibility|-25211|-1719|not allowed/i.test(message)) {
      throw new AccessibilityError(message);
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

export function badgeToCount(badge: string): number {
  const trimmed = badge.trim();
  if (!trimmed) return 0;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits) return parseInt(digits, 10);
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
