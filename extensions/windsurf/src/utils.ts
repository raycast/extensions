import {
  FileEntry,
  FolderEntry,
  WorkspaceEntry,
  RemoteEntry,
  RemoteWorkspaceEntry,
  EntryLike,
  EntryType,
} from "./types";
import * as fs from "fs";

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export function compactNumberFormat(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + "M";
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + "K";
  }
  return num.toString();
}

export async function fileExists(filename: string): Promise<boolean> {
  return fs.promises
    .access(filename, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

export function isFileEntry(entry: EntryLike): entry is FileEntry {
  return (
    "fileUri" in entry && !("folderUri" in entry) && !("workspace" in entry)
  );
}

export function isFolderEntry(entry: EntryLike): entry is FolderEntry {
  return (
    "folderUri" in entry &&
    !("workspace" in entry) &&
    !("remoteAuthority" in entry)
  );
}

export function isWorkspaceEntry(entry: EntryLike): entry is WorkspaceEntry {
  return "workspace" in entry && !("remoteAuthority" in entry);
}

export function isRemoteEntry(entry: EntryLike): entry is RemoteEntry {
  return (
    "folderUri" in entry &&
    "remoteAuthority" in entry &&
    !("workspace" in entry)
  );
}

export function isRemoteWorkspaceEntry(
  entry: EntryLike
): entry is RemoteWorkspaceEntry {
  return "workspace" in entry && "remoteAuthority" in entry;
}

export function getEntryType(entry: EntryLike): EntryType {
  if (isWorkspaceEntry(entry)) {
    return EntryType.Workspaces;
  } else if (isFileEntry(entry)) {
    return EntryType.Files;
  } else if (isRemoteWorkspaceEntry(entry)) {
    return EntryType.RemoteWorkspace;
  } else if (isRemoteEntry(entry)) {
    return EntryType.RemoteFolders;
  } else if (isFolderEntry(entry)) {
    return EntryType.Folders;
  }
  return EntryType.AllTypes;
}

export function filterEntriesByType(type: EntryType | null) {
  return (entry: EntryLike) => {
    if (!type || type === EntryType.AllTypes) {
      return true;
    }
    return getEntryType(entry) === type;
  };
}

export function filterUnpinnedEntries(pinnedEntries: EntryLike[]) {
  return (entry: EntryLike) => {
    return !pinnedEntries.some((pinnedEntry) =>
      isSameEntry(pinnedEntry, entry)
    );
  };
}

export function isSameEntry(entry1: EntryLike, entry2: EntryLike): boolean {
  if (isWorkspaceEntry(entry1) && isWorkspaceEntry(entry2)) {
    return entry1.workspace.configPath === entry2.workspace.configPath;
  }
  if (isFolderEntry(entry1) && isFolderEntry(entry2)) {
    return entry1.folderUri === entry2.folderUri;
  }
  if (isFileEntry(entry1) && isFileEntry(entry2)) {
    return entry1.fileUri === entry2.fileUri;
  }
  if (isRemoteEntry(entry1) && isRemoteEntry(entry2)) {
    return (
      entry1.folderUri === entry2.folderUri &&
      entry1.remoteAuthority === entry2.remoteAuthority
    );
  }
  if (isRemoteWorkspaceEntry(entry1) && isRemoteWorkspaceEntry(entry2)) {
    return (
      entry1.workspace.configPath === entry2.workspace.configPath &&
      entry1.remoteAuthority === entry2.remoteAuthority
    );
  }
  return false;
}

export function isValidHexColor(color: string): boolean {
  return /^#[0-9A-F]{6}$/i.test(color);
}
