export interface SpaceInfo {
  id: string;
  name: string;
  colour: number;
  icon?: string;
}

export interface SearchTab {
  id: string;
  title: string;
  url: string;
  windowId: number;
  tabIndex: number;
  activeTabIndex?: number;
  windowTabCount?: number;
  windowCount?: number;
  activeTabTitle?: string;
  space: string;
  profile: string;
  isActive: boolean;
  isPinned?: boolean;
  touchedAt?: number;
  source: "live" | "session";
}

export interface RemoteDeviceTabs {
  deviceId: string;
  deviceName: string;
  platform: string;
  updatedAt: Date | null;
  tabs: Array<{
    id: string;
    title: string;
    url: string;
    deviceName: string;
    platform: string;
  }>;
}

export interface PinnedTab {
  id: string;
  title: string;
  url: string;
  spaceId: string;
  spaceName: string;
  folderName?: string;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url: string;
  folderPath: string[];
  folderLabel: string;
}

export interface HistoryEntry {
  id: string;
  title: string;
  url: string;
  visitCount: number;
  lastVisited: Date;
}

export interface BrowserSettingsSnapshot {
  engine?: string;
  customSearchUrl?: string;
  look?: string;
}

export interface OpenTabsResult {
  tabs: SearchTab[];
  isRunning: boolean;
  permissionDenied: boolean;
}
