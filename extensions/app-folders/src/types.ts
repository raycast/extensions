/**
 * Core data models used by the App Folders extension.
 */

// Individual application item
export interface AppItem {
  id: string; // Unique ID (absolute file path)
  name: string; // Display name of the application (e.g. "Slack", "Safari")
  path: string; // Absolute path on the macOS filesystem
  keywords?: string[]; // Search keywords
  launchCount?: number; // Total launch count
  lastLaunchedAt?: number; // Timestamp of last launch
}

// App folder container
export interface Folder {
  id: string; // Unique ID (UUID based on timestamp)
  name: string; // Folder name (e.g. "Utilities", "Design")
  icon?: string; // Optional custom emoji or image file path
  previewStyle?: "auto" | "plain"; // 'auto': translucent 2x2 squircle box, 'plain': classic macOS folder
  slot?: number; // Optional shortcut slot number (1 to 5)
  apps: AppItem[]; // List of applications inside the folder
  createdAt: number; // Creation timestamp
}
