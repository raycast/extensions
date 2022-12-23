import { Image } from "@raycast/api";

export type HistoryEntry = {
  id: number;
  url: string;
  title: string;
  lastVisitedAt: string;
};

export type TopSite = {
  url: string;
  title: string; 
  urlRank: number;
};

export type Tab = {
  windowId: number;
  tabId: number;
  url: string;
  title: string;
};

export type SideBarTab = {
  id: string; 
  title: string; 
  url: string; 
  icon: Image.ImageLike; 
}

export type SideBarDocument = {
  id: string; 
  title: string; 
  type: "notes" | "easel";
  color: string; 
}

export type SideBarSplitView = {
  id: string; 
  tabs: SideBarTab[]; 
  color: string; 
}

export type SideBarFolder = {
  id: string;
  title: string;
  children: SideBarItem[];
  color: string; 
}

export type SideBarItem = SideBarTab | SideBarDocument | SideBarSplitView | SideBarFolder;

export type SideBarSpace = {
  id: string; 
  title: string; 
  icon: Image.ImageLike; 
  color: string;
  pinned: SideBarItem[];
  unpinned: SideBarTab[];
}


export type SearchResult = {
  parent: SideBarSpace | SideBarFolder;
  children: SideBarItem[];
}
