export interface WindowInfo {
  appName: string;
  windowTitle: string;
  windowId: string; // Composite key: "bundleId::index" or "appName::index"
  bundleId?: string; // App bundle ID for reliable matching
}

export interface WindowGroup {
  id: string;
  name: string;
  windows: WindowInfo[];
  createdAt: string;
  updatedAt: string;
}

export interface GroupsStorage {
  groups: WindowGroup[];
}
