import { isDarkMode, pressDockTile, readDockTiles as readSwiftDockTiles } from "swift:../swift";

export interface DockTile {
  /** Dock tile name as shown in the Dock (usually the app name). */
  name: string;
  /** Raw badge label: a number such as "12" or "1,234", "99+", "•" for dot badges, or "" when there is no badge. */
  badge: string;
  /** Numeric badge value. Capped labels such as "99+" use the leading number; dots and other text count as 1. */
  count: number;
  /** 1-based position among application tiles sharing this name, so duplicates can be told apart. */
  ordinal: number;
  /** Path of the app bundle the tile represents, when the Dock exposes it. */
  path?: string;
  /** Bundle identifier of that app, when it has one. */
  bundleId?: string;
  /** 0-based position among application tiles in the Dock. */
  index: number;
}

/** A tile as returned by the Swift helper; optional fields are omitted when nil. */
interface SwiftDockTile {
  name: string;
  badge: string;
  path?: string;
  bundleId?: string;
  index: number;
}

export class AccessibilityError extends Error {}

/** Whether a failure means Raycast lacks the Accessibility grant (the Swift helper checks AXIsProcessTrusted). */
export function isAccessibilityError(error: unknown): boolean {
  if (error instanceof AccessibilityError) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /Accessibility permission is required/i.test(message);
}

/**
 * Reads every application tile in the Dock and its badge through the Accessibility API, in Dock order.
 * Works even when the Dock is auto-hidden. Requires Accessibility permission for Raycast.
 */
export async function readDockTiles(): Promise<DockTile[]> {
  let tiles: SwiftDockTile[];
  try {
    tiles = await readSwiftDockTiles();
  } catch (error) {
    if (isAccessibilityError(error)) {
      throw new AccessibilityError(error instanceof Error ? error.message : String(error));
    }
    throw error;
  }

  const seen = new Map<string, number>();
  return tiles.map(({ name, badge, path, bundleId, index }) => {
    const ordinal = (seen.get(name) ?? 0) + 1;
    seen.set(name, ordinal);
    return { name, badge, count: badgeToCount(badge), ordinal, path, bundleId, index };
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
    return await isDarkMode();
  } catch {
    return false;
  }
}

/**
 * Clicks an application Dock tile via Accessibility, exactly as the user would. The tile at its read
 * position is used while it still matches; otherwise it is found again by bundle path, or by name and
 * `ordinal` when it has no path. Rejects when a tile with a path is no longer in the Dock.
 */
export async function clickDockTile(tile: DockTile): Promise<void> {
  await pressDockTile(tile.name, tile.ordinal, tile.index, tile.path);
}
