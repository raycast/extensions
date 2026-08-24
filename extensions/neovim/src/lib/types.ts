export interface SessionEntry {
  id: string;
  name: string;
  path: string;
  lastOpened: Date;
  source: "persistence" | "recent";
  pinned?: boolean;
}

export interface PluginEntry {
  name: string;
  branch: string;
  commit: string;
  githubUrl?: string;
}

export interface KeymapEntry {
  lhs: string;
  rhs: string;
  source: string;
  desc?: string;
}

export interface RecentDirEntry {
  path: string;
  lastOpened: string;
  openCount: number;
}

export type ViewLayout = "list" | "grid";
