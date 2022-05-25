import { existsSync } from "fs";
import { URL } from "url";

export interface FileEntry {
  id: string;
  fileUri: string;
}

export function isFileEntry(entry: EntryLike): entry is FileEntry {
  const { id, fileUri } = entry as FileEntry;
  return id === "openRecentFile" && existsSync(new URL(fileUri));
}

export interface FolderEntry {
  id: string;
  folderUri: string;
  scheme: string;
}

export function isFolderEntry(entry: EntryLike): entry is FolderEntry {
  const { id, scheme, folderUri } = entry as FolderEntry;
  return id === "openRecentFolder" && scheme !== "vscode-remote" && existsSync(new URL(folderUri));
}

export interface WorkspaceEntry {
  id: string;
  fileUri: string;
}

export function isWorkspaceEntry(entry: EntryLike): entry is WorkspaceEntry {
  const { id, fileUri } = entry as WorkspaceEntry;
  return id === "openRecentWorkspace" && existsSync(new URL(fileUri));
}

export interface RemoteEntry {
  id: string;
  folderUri: string;
  scheme: string;
  label: string;
}

export function isRemoteEntry(entry: EntryLike): entry is RemoteEntry {
  const { id, scheme } = entry as RemoteEntry;
  return id === "openRecentFolder" && scheme === "vscode-remote";
}

export type EntryLike = FolderEntry | FileEntry | WorkspaceEntry | RemoteEntry;

export enum VSCodeBuild {
  Code = "Code",
  Insiders = "Code - Insiders",
}
export interface Preferences {
  build: VSCodeBuild;
}

export const RecentOpenedId = "submenuitem.35";
export enum RecentOpenedItemId {
  Folder = "openRecentFolder",
  File = "openRecentFile",
  Workspace = "openRecentWorkspace",
  Other = "useless",
}

interface RecentOpenItem {
  id: RecentOpenedItemId.Folder | RecentOpenedItemId.File | RecentOpenedItemId.Workspace;
  uri: {
    path: string;
    scheme: string;
    external: string;
  };
  enabled: boolean;
  label: string;
}

export interface lastKnownMenubarItems {
  id: string;
  label: string;
  submenu?: {
    items: Array<RecentOpenItem>;
  };
}
