/**
 * Represents information about an open window
 */
export interface WindowInfo {
  /** Window handle (HWND) - unique identifier for the window */
  handle: number;
  /** Window title/caption text */
  title: string;
  /** Process name without extension (e.g., "chrome", "explorer") */
  processName: string;
  /** Full path to the executable */
  processPath: string;
  /** Whether the window is always-on-top */
  isTopMost?: boolean;
  /** Path to extracted app icon (optional) */
  iconPath?: string;
}

/**
 * Window layout preset
 */
export interface LayoutPreset {
  name: string;
  icon: string;
  description: string;
  apply: (
    screenWidth: number,
    screenHeight: number,
    screenX: number,
    screenY: number,
  ) => {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

/**
 * Recent window entry for tracking usage
 */
export interface RecentWindow {
  /** Process name for matching */
  processName: string;
  /** Window title for matching */
  title: string;
  /** Timestamp of last switch */
  timestamp: number;
}

/**
 * Pinned window entry
 */
export interface PinnedWindow {
  /** Process name for matching */
  processName: string;
  /** Optional title pattern for matching specific windows */
  titlePattern?: string;
}

/**
 * Cached window info for perma-pinned windows (shown even when closed)
 */
export interface CachedWindowInfo {
  /** Process name */
  processName: string;
  /** Window title */
  title: string;
  /** Full path to the executable */
  processPath: string;
  /** Path to extracted app icon (optional) */
  iconPath?: string;
  /** Timestamp when cached */
  cachedAt: number;
}
