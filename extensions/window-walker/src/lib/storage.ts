import { LocalStorage } from "@raycast/api";
import { RecentWindow, PinnedWindow } from "./types";

const RECENT_WINDOWS_KEY = "recentWindows";
const PERMA_PINNED_WINDOWS_KEY = "permaPinnedWindows";
const MAX_RECENT_WINDOWS = 20;

// In-memory cache for session pins (reset on reboot/close)
let sessionPins: PinnedWindow[] = [];

/**
 * Get recent windows from storage.
 */
export async function getRecentWindows(): Promise<RecentWindow[]> {
  try {
    const data = await LocalStorage.getItem<string>(RECENT_WINDOWS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load recent windows:", error);
  }
  return [];
}

/**
 * Add a window to recent history.
 */
export async function addRecentWindow(processName: string, title: string): Promise<void> {
  try {
    const recent = await getRecentWindows();

    // Remove existing entry for same window
    const filtered = recent.filter((w) => !(w.processName === processName && w.title === title));

    // Add new entry at the beginning
    filtered.unshift({
      processName,
      title,
      timestamp: Date.now(),
    });

    // Keep only the last N entries
    const trimmed = filtered.slice(0, MAX_RECENT_WINDOWS);

    await LocalStorage.setItem(RECENT_WINDOWS_KEY, JSON.stringify(trimmed));
  } catch (error) {
    console.error("Failed to save recent window:", error);
  }
}

/**
 * Get perma-pinned windows from storage (persists across reboots).
 */
export async function getPermaPinnedWindows(): Promise<PinnedWindow[]> {
  try {
    const data = await LocalStorage.getItem<string>(PERMA_PINNED_WINDOWS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load perma-pinned windows:", error);
  }
  return [];
}

/**
 * Get all pinned windows (session + perma).
 */
export async function getPinnedWindows(): Promise<PinnedWindow[]> {
  const permaPinned = await getPermaPinnedWindows();
  // Combine perma pins with session pins, avoiding duplicates
  const combined = [...permaPinned];
  for (const sp of sessionPins) {
    const exists = combined.some((w) => w.processName === sp.processName && w.titlePattern === sp.titlePattern);
    if (!exists) {
      combined.push(sp);
    }
  }
  return combined;
}

/**
 * Pin a window (session only - resets when Raycast closes).
 */
export async function pinWindow(processName: string, titlePattern?: string): Promise<void> {
  // Check if already pinned
  const exists = sessionPins.some((w) => w.processName === processName && w.titlePattern === titlePattern);
  if (!exists) {
    sessionPins.push({ processName, titlePattern });
  }
}

/**
 * Perma-pin a window (persists across reboots).
 */
export async function permaPinWindow(processName: string, titlePattern?: string): Promise<void> {
  try {
    const pinned = await getPermaPinnedWindows();

    // Check if already perma-pinned
    const exists = pinned.some((w) => w.processName === processName && w.titlePattern === titlePattern);

    if (!exists) {
      pinned.push({ processName, titlePattern });
      await LocalStorage.setItem(PERMA_PINNED_WINDOWS_KEY, JSON.stringify(pinned));
    }

    // Also remove from session pins if there
    sessionPins = sessionPins.filter((w) => !(w.processName === processName && w.titlePattern === titlePattern));
  } catch (error) {
    console.error("Failed to perma-pin window:", error);
  }
}

/**
 * Unpin a window (both session and perma).
 */
export async function unpinWindow(processName: string, titlePattern?: string): Promise<void> {
  // Remove from session pins
  sessionPins = sessionPins.filter((w) => !(w.processName === processName && w.titlePattern === titlePattern));

  // Remove from perma pins
  try {
    const pinned = await getPermaPinnedWindows();
    const filtered = pinned.filter((w) => !(w.processName === processName && w.titlePattern === titlePattern));
    await LocalStorage.setItem(PERMA_PINNED_WINDOWS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to unpin window:", error);
  }
}

/**
 * Check if a window is pinned (session or perma).
 */
export async function isWindowPinned(processName: string, title: string): Promise<boolean> {
  const pinned = await getPinnedWindows();
  return pinned.some((w) => {
    if (w.processName !== processName) return false;
    if (w.titlePattern) {
      return title.includes(w.titlePattern);
    }
    return true;
  });
}

/**
 * Check if a window is perma-pinned.
 */
export async function isWindowPermaPinned(processName: string, title: string): Promise<boolean> {
  const pinned = await getPermaPinnedWindows();
  return pinned.some((w) => {
    if (w.processName !== processName) return false;
    if (w.titlePattern) {
      return title.includes(w.titlePattern);
    }
    return true;
  });
}

/**
 * Clear all recent windows.
 */
export async function clearRecentWindows(): Promise<void> {
  await LocalStorage.removeItem(RECENT_WINDOWS_KEY);
}

/**
 * Clear all pinned windows (session only).
 */
export async function clearSessionPins(): Promise<void> {
  sessionPins = [];
}

/**
 * Clear all perma-pinned windows.
 */
export async function clearPermaPinnedWindows(): Promise<void> {
  await LocalStorage.removeItem(PERMA_PINNED_WINDOWS_KEY);
}
