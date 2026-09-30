/**
 * Resolution object type
 */
export interface Resolution {
  /** Width */
  width: number;
  /** Height */
  height: number;
  /** Display title, typically in "width×height" format */
  title: string;
  /** Whether this is a custom resolution */
  isCustom?: boolean;
  /** Whether this resolution is starred */
  isStarred?: boolean;
}

/**
 * Window information type
 */
export interface WindowInfo {
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Window width */
  width: number;
  /** Window height */
  height: number;
}

/**
 * Screen information type
 */
export interface ScreenInfo {
  /** Screen width */
  width: number;
  /** Screen height */
  height: number;
  /** Screen index */
  index: number;
  /** Screen origin X coordinate */
  x: number;
  /** Screen origin Y coordinate */
  y: number;
}

/**
 * Window details object from Swift function
 */
export interface WindowDetailsObject {
  /** Whether an error occurred */
  error: boolean;
  /** Optional error message */
  message?: string;
  /** Window reference ID */
  windowRefID?: string;
  /** Window position and size details */
  window?: {
    position: { x: number; y: number };
    size: { width: number; height: number };
  };
  /** Application details */
  app?: {
    name: string;
    processID: number;
  };
}

/**
 * Window state structure for storing window size
 */
export interface WindowState {
  /** Window unique ID (format: appName.processID) */
  windowId: string;
  /** Window size */
  size: {
    width: number;
    height: number;
  };
  /** Window position */
  position?: {
    x: number;
    y: number;
  };
  /** Timestamp when the state was saved */
  timestamp: number;
}

/**
 * Interface for resize results - must match Swift's ResizeResult struct
 */
export interface ResizeResult {
  /** Whether the operation was successful */
  success: boolean;
  /** Actual width after resize */
  width: number;
  /** Actual height after resize */
  height: number;
  /** X coordinate */
  x: number;
  /** Y coordinate */
  y: number;
  /** Originally requested width */
  requestedWidth: number;
  /** Originally requested height */
  requestedHeight: number;
  /** Optional error message */
  message?: string;
}
