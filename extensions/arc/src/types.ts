export type HistoryEntry = {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
};

export type Tab = {
  windowId: number;
  tabId: number;
  url: string;
  title: string;
  location: "topApp" | "pinned" | "unpinned";
};

export type Space = {
  id: string;
  title?: string;
};
