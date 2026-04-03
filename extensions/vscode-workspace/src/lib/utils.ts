import { existsSync } from "fs";
import { URL } from "url";
import {
  EntryLike,
  EntryType,
  FileEntry,
  FolderEntry,
  RemoteEntry,
  RemoteWorkspaceEntry,
  WorkspaceEntry,
} from "./types";

export const isWin = process.platform === "win32";
export const isMac = process.platform === "darwin";

export function isFileEntry(entry: EntryLike): entry is FileEntry {
  const { fileUri } = entry as FileEntry;
  if (fileUri === undefined) return false;
  try {
    const fileUrl = new URL(fileUri);
    return existsSync(fileUrl) && fileUri.indexOf(".code-workspace") === -1;
  } catch {
    return false;
  }
}

export function isFolderEntry(entry: EntryLike): entry is FolderEntry {
  const { folderUri } = entry as FolderEntry;
  if (folderUri === undefined) return false;
  try {
    const folderUrl = new URL(folderUri);
    return existsSync(folderUrl);
  } catch {
    return false;
  }
}

export function isWorkspaceEntry(entry: EntryLike): entry is WorkspaceEntry {
  const { workspace } = entry as WorkspaceEntry;
  if (workspace === undefined) return false;
  try {
    const configUrl = new URL(workspace.configPath);
    return (
      existsSync(configUrl) &&
      workspace.configPath.indexOf(".code-workspace") !== -1
    );
  } catch {
    return false;
  }
}

export function isRemoteEntry(entry: EntryLike): entry is RemoteEntry {
  const { folderUri, remoteAuthority } = entry as RemoteEntry;
  return folderUri !== undefined && remoteAuthority !== undefined;
}

export function isRemoteWorkspaceEntry(
  entry: EntryLike,
): entry is RemoteWorkspaceEntry {
  const { workspace, remoteAuthority } = entry as RemoteWorkspaceEntry;
  return workspace !== undefined && remoteAuthority !== undefined;
}

export function filterEntriesByType(filter: EntryType | null) {
  switch (filter) {
    case "All Types":
    case null:
      return () => true;
    case "Workspaces":
      return isWorkspaceEntry;
    case "Folders":
      return isFolderEntry;
    case "Remote Folders":
      return isRemoteEntry;
    case "Remote Workspace":
      return isRemoteWorkspaceEntry;
    case "Files":
      return isFileEntry;
    default:
      return () => false;
  }
}
