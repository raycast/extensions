import { runAppleScript } from "@raycast/utils";

export interface DockTile {
  /** Dock tile name as shown in the Dock (usually the app name). */
  name: string;
  /** Raw badge label: a number such as "12" or "1,234", "99+", "•" for dot badges, or "" when there is no badge. */
  badge: string;
  /** Numeric badge value. Capped labels such as "99+" use the leading number; dots and other text count as 1. */
  count: number;
  /** 1-based position among application tiles sharing this name, so duplicates can be told apart. */
  ordinal: number;
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
        set out to out & n & "${SEP}" & s & linefeed
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

  const seen = new Map<string, number>();
  return raw
    .split("\n")
    .filter((line) => line.length > 0)
    .map((line) => {
      const [name = "", badge = ""] = line.split(SEP);
      const ordinal = (seen.get(name) ?? 0) + 1;
      seen.set(name, ordinal);
      return { name, badge, count: badgeToCount(badge), ordinal };
    });
}

/**
 * Numeric value of a badge label. Labels that are entirely a number — including locale grouping
 * separators such as "1,234" / "1.234" and a trailing cap such as "99+" — are parsed; anything
 * else with a badge counts as 1, so a label that merely contains digits is never misread as a count.
 */
export function badgeToCount(badge: string): number {
  const trimmed = badge.trim();
  if (!trimmed) return 0;
  if (/^\d[\d,.\s']*\+?$/.test(trimmed)) return parseInt(trimmed.replace(/\D/g, ""), 10);
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

/**
 * Clicks an application Dock tile via Accessibility, activating whatever it represents. `ordinal`
 * picks among tiles sharing the name, in Dock order, so the tile read earlier is the one clicked.
 * If that tile has since gone but others with the name remain, the nearest remaining one is
 * clicked instead; only a name with no tile at all is an error.
 */
export async function clickDockTile(name: string, ordinal = 1): Promise<void> {
  const escaped = name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  await runAppleScript(
    `
tell application "System Events"
  tell process "Dock"
    set matches to (UI elements of list 1 whose name is "${escaped}" and subrole is "AXApplicationDockItem")
    set n to count of matches
    if n is 0 then error "No Dock tile named \\"${escaped}\\"" number 1000
    set i to ${Math.max(1, Math.floor(ordinal))}
    if i > n then set i to n
    click item i of matches
  end tell
end tell
`,
    { timeout: 5000 },
  );
}
