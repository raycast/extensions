export type WorkspaceItemType = "app" | "folder" | "file" | "url" | "terminal";

export interface WorkspaceItem {
  id: string;
  type: WorkspaceItemType;
  name: string;
  path: string; // For apps/folders/files: file path; for URLs: URL; for terminal: command
  delay?: number; // Optional delay in milliseconds before launching
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  items: WorkspaceItem[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkspacesData {
  workspaces: Workspace[];
}

/**
 * Tracking mode for windows/apps
 * - "window": Track individual window by ID (for AppleScript-aware apps)
 * - "app": Track entire app (for non-scriptable apps like Electron)
 */
export type TrackingMode = "window" | "app";

/**
 * Represents a tracked window opened by a workspace item
 */
export interface TrackedWindow {
  id: string; // Our generated UUID
  systemWindowId: number; // macOS System Events window ID (or 0 for app-level tracking)
  itemId: string; // Reference to WorkspaceItem.id
  appName: string; // Process name for System Events
  windowTitle?: string; // For verification/debugging
  type: WorkspaceItemType;
  trackingMode: TrackingMode; // How this item is being tracked
  launchedAt: number; // Timestamp
}

/**
 * Represents an active workspace session with tracked windows
 */
export interface WorkspaceSession {
  workspaceId: string;
  openedAt: number;
  lastVerified?: number; // Last time we checked windows still exist
  windows: TrackedWindow[];
}

/**
 * Collection of all active workspace sessions
 */
export interface SessionsData {
  sessions: WorkspaceSession[];
}
