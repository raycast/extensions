import { LocalStorage } from "@raycast/api";
import { RecentWindow, PinnedWindow, CachedWindowInfo } from "./types";

const RECENT_WINDOWS_KEY = "recentWindows";
const PERMA_PINNED_WINDOWS_KEY = "permaPinnedWindows";
const SESSION_PINNED_WINDOWS_KEY = "sessionPinnedWindows";
const CACHED_PERMA_PINNED_WINDOWS_KEY = "cachedPermaPinnedWindows";
const MAX_RECENT_WINDOWS = 20;

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
 * Get session-pinned windows from storage.
 */
export async function getSessionPinnedWindows(): Promise<PinnedWindow[]> {
  try {
    const data = await LocalStorage.getItem<string>(SESSION_PINNED_WINDOWS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load session-pinned windows:", error);
  }
  return [];
}

/**
 * Get all pinned windows (session + perma).
 */
export async function getPinnedWindows(): Promise<PinnedWindow[]> {
  const permaPinned = await getPermaPinnedWindows();
  const sessionPinned = await getSessionPinnedWindows();
  // Combine perma pins with session pins, avoiding duplicates
  const combined = [...permaPinned];
  for (const sp of sessionPinned) {
    const exists = combined.some((w) => w.processName === sp.processName && w.titlePattern === sp.titlePattern);
    if (!exists) {
      combined.push(sp);
    }
  }
  return combined;
}

/**
 * Pin a window (session only - persists until Raycast/PC reboots).
 */
export async function pinWindow(processName: string, titlePattern?: string): Promise<void> {
  try {
    const sessionPinned = await getSessionPinnedWindows();
    // Check if already pinned
    const exists = sessionPinned.some((w) => w.processName === processName && w.titlePattern === titlePattern);
    if (!exists) {
      sessionPinned.push({ processName, titlePattern });
      await LocalStorage.setItem(SESSION_PINNED_WINDOWS_KEY, JSON.stringify(sessionPinned));
    }
  } catch (error) {
    console.error("Failed to pin window:", error);
  }
}

/**
 * Cache window info for perma-pinned windows (so they show even when closed).
 */
export async function cachePermaPinnedWindow(windowInfo: CachedWindowInfo): Promise<void> {
  try {
    const cached = await getCachedPermaPinnedWindows();
    // Remove existing entry for same window
    const filtered = cached.filter((w) => !(w.processName === windowInfo.processName && w.title === windowInfo.title));
    // Add/update entry
    filtered.push(windowInfo);
    await LocalStorage.setItem(CACHED_PERMA_PINNED_WINDOWS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to cache perma-pinned window:", error);
  }
}

/**
 * Get cached window info for perma-pinned windows.
 */
export async function getCachedPermaPinnedWindows(): Promise<CachedWindowInfo[]> {
  try {
    const data = await LocalStorage.getItem<string>(CACHED_PERMA_PINNED_WINDOWS_KEY);
    if (data) {
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to load cached perma-pinned windows:", error);
  }
  return [];
}

/**
 * Perma-pin a window (persists across reboots).
 */
export async function permaPinWindow(
  processName: string,
  titlePattern?: string,
  windowInfo?: CachedWindowInfo,
): Promise<void> {
  try {
    const pinned = await getPermaPinnedWindows();

    // Check if already perma-pinned
    const exists = pinned.some((w) => w.processName === processName && w.titlePattern === titlePattern);

    if (!exists) {
      pinned.push({ processName, titlePattern });
      await LocalStorage.setItem(PERMA_PINNED_WINDOWS_KEY, JSON.stringify(pinned));
    }

    // Cache window info if provided (so it shows even when closed)
    if (windowInfo) {
      await cachePermaPinnedWindow(windowInfo);
    }

    // Also remove from session pins if there
    const sessionPinned = await getSessionPinnedWindows();
    const filtered = sessionPinned.filter((w) => !(w.processName === processName && w.titlePattern === titlePattern));
    await LocalStorage.setItem(SESSION_PINNED_WINDOWS_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.error("Failed to perma-pin window:", error);
  }
}

/**
 * Unpin a window (both session and perma).
 */
export async function unpinWindow(processName: string, titlePattern?: string): Promise<void> {
  try {
    // Remove from session pins
    const sessionPinned = await getSessionPinnedWindows();
    const filteredSession = sessionPinned.filter(
      (w) => !(w.processName === processName && w.titlePattern === titlePattern),
    );
    await LocalStorage.setItem(SESSION_PINNED_WINDOWS_KEY, JSON.stringify(filteredSession));

    // Remove from perma pins
    const pinned = await getPermaPinnedWindows();
    const filteredPerma = pinned.filter((w) => !(w.processName === processName && w.titlePattern === titlePattern));
    await LocalStorage.setItem(PERMA_PINNED_WINDOWS_KEY, JSON.stringify(filteredPerma));

    // Remove from cached perma-pinned windows if it matches
    const cached = await getCachedPermaPinnedWindows();
    const filteredCached = cached.filter(
      (w) => !(w.processName === processName && (!titlePattern || w.title.includes(titlePattern))),
    );
    await LocalStorage.setItem(CACHED_PERMA_PINNED_WINDOWS_KEY, JSON.stringify(filteredCached));
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
  await LocalStorage.removeItem(SESSION_PINNED_WINDOWS_KEY);
}

/**
 * Clear all perma-pinned windows.
 */
export async function clearPermaPinnedWindows(): Promise<void> {
  await LocalStorage.removeItem(PERMA_PINNED_WINDOWS_KEY);
}
