// === Window data models ===

export interface WindowInfo {
  windowId: number;
  appBundleId: string;
  appName: string;
  windowTitle: string;
  spaceIds: number[];
}

export interface GroupWindow {
  bundleId: string; // e.g. "com.brave.Browser"
  titleMatch: string; // substring match on window title
  appName: string; // display name for UI, e.g. "Brave Browser"
  windowId?: number; // CGWindowID — ephemeral, best-effort match for current session
}

// === Group data models ===

export interface Group {
  id: string;
  name: string;
  windows: GroupWindow[];
  slot?: number; // 1–5, for hotkey slot assignment
}

// === Storage schema ===

export interface StorageData {
  version: 5;
  groups: Group[];
}
