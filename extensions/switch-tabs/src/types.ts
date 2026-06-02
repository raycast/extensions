import { List, Color } from "@raycast/api";

export interface ExtensionTab {
  id: string | number;
  url: string;
  title: string;
  groupId: string | number;
  windowId?: string;
  active?: boolean;
  audible?: boolean;
  discarded?: boolean;
  frozen?: boolean;
  pinned?: boolean;
  lastAccessed: number;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  playbackRate?: number;
  favIconUrl?: string;
  browserType?: "edge" | "chrome" | "brave" | "helium" | "other";
  windowType?: string;
  windowFocused?: boolean;
  windowState?: string;
  workspaceId?: string | null;
  workspaceName?: string;
}

export interface ExtensionGroup {
  id: string | number;
  color: string;
  title: string;
  browserType?: "edge" | "chrome" | "brave" | "helium" | "other";
}

export interface HistoryItem {
  id: string;
  url?: string;
  title?: string;
  favIconUrl?: string;
  lastVisitTime?: number;
}

export interface BookmarkItem {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkItem[];
  browserType?: string;
  dateAdded?: number;
}

export interface DownloadItem {
  id: string;
  rawId?: number;
  filename: string;
  url: string;
  state: "in_progress" | "complete" | "interrupted";
  bytesReceived: number;
  totalBytes: number;
  mime: string;
  startTime: string;
  endTime?: string;
  exists: boolean;
  canResume: boolean;
  danger: string;
  fileSize: number;
  paused: boolean;
  error?: string;
  fileIcon?: string;
  browserType?: string;
}

export interface BridgeMessage {
  type: string;
  tabs?: ExtensionTab[];
  groups?: ExtensionGroup[];
  sessions?: HistoryItem[];
  history?: HistoryItem[];
  status?: string;
  amount?: number;
  direction?: string;
  message?: string;
  tabId?: string | number;
  currentTime?: number;
  duration?: number;
  paused?: boolean;
  playbackRate?: number;
  bookmarks?: BookmarkItem[];
  downloads?: DownloadItem[];
  browserType?: string;
  windowType?: string;
  windowState?: string;
  path?: string;
  newName?: string;
  workspaces?: WorkspaceInfo[];
  channel?: string;
  url?: string;
  browser?: string;
  windowId?: string;
  id?: string | number;
  isFolder?: boolean;
  sessionId?: string | number;
  asPopup?: boolean;
  background?: boolean;
  title?: string;
  groupId?: string | number;
  groupName?: string;
  color?: string;
  tabIds?: string[];
  silent?: boolean;
  parentId?: string;
  newTitle?: string;
  currentPinned?: boolean;
}

export interface DisplayTab {
  id: string;
  title: string;
  url: string;
  displayTitle: string;
  subtitle: string;
  accessories: List.Item.Accessory[];
  groupId: string | number;
  discarded?: boolean;
  frozen?: boolean;
  pinned?: boolean;
  extId?: string | number;
  currentTime?: number;
  duration?: number;
  isActive?: boolean;
  audible?: boolean;
  paused?: boolean;
  playbackRate?: number;
  lastAccessed: number;
  browserIndex: number;
  windowId?: string;
  favIconUrl?: string;
  browserType?: "edge" | "chrome" | "brave" | "helium" | "other";
  windowType?: string;
  windowFocused?: boolean;
  windowState?: string;
  workspaceId?: string | null;
  workspaceName?: string;
  searchTitle: string; // V200: Pre-computed lowercase for instant search
  searchUrl: string; // V200: Pre-computed lowercase for instant search
  displaySubtitle?: string; // V1605: Pre-formatted URL for instant display
  cachedAccessories?: List.Item.Accessory[]; // V1605: Pre-computed icons for virtual performance
}

export interface ExtensionData {
  tabs: ExtensionTab[];
  groups: Record<string | number, ExtensionGroup>;
  mergedTabs?: DisplayTab[]; // V309: Pre-processed for instant start
}

export type CollapsedListItem =
  | {
      type: "folder";
      id: number | string;
      title: string;
      color: string | Color;
      tabs: DisplayTab[];
      isActive?: boolean;
      browserType?: string;
    }
  | { type: "tab"; tab: DisplayTab };

export interface WorkspaceInfo {
  name: string;
  guid?: string;
  color?: string;
}

export interface SearchInput {
  id: string;
  label: string;
  value?: string;
}
