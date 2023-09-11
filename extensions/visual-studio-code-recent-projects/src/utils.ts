import { existsSync } from "fs";
import { URL } from "url";
import { isDeepStrictEqual } from "util";
import {
  EntryType,
  EntryLike,
  FileEntry,
  FolderEntry,
  RemoteEntry,
  WorkspaceEntry,
  RemoteWorkspaceEntry,
} from "./types";
import { open } from "@raycast/api";
import * as fs from "fs";
import { getBuildScheme } from "./lib/vscode";

// Type Guards

export function isFileEntry(entry: EntryLike): entry is FileEntry {
  const { fileUri } = entry as FileEntry;

  if (fileUri === undefined) {
    return false;
  }

  try {
    const fileUrl = new URL(fileUri);
    return existsSync(fileUrl) && fileUri.indexOf(".code-workspace") === -1;
  } catch (error) {
    return false;
  }
}

export function isFolderEntry(entry: EntryLike): entry is FolderEntry {
  const { folderUri } = entry as FolderEntry;

  if (folderUri === undefined) {
    return false;
  }

  try {
    const folderUrl = new URL(folderUri);
    return existsSync(folderUrl);
  } catch (error) {
    return false;
  }
}

export function isWorkspaceEntry(entry: EntryLike): entry is WorkspaceEntry {
  const { workspace } = entry as WorkspaceEntry;

  if (workspace === undefined) {
    return false;
  }

  try {
    const configUrl = new URL(workspace.configPath);
    return existsSync(configUrl) && workspace.configPath.indexOf(".code-workspace") !== -1;
  } catch (error) {
    return false;
  }
}

export function isRemoteEntry(entry: EntryLike): entry is RemoteEntry {
  const { folderUri, remoteAuthority } = entry as RemoteEntry;
  return folderUri !== undefined && remoteAuthority !== undefined;
}

export function isRemoteWorkspaceEntry(entry: EntryLike): entry is RemoteWorkspaceEntry {
  const { workspace, remoteAuthority } = entry as RemoteWorkspaceEntry;
  return workspace !== undefined && remoteAuthority !== undefined;
}

// Filters

export function filterEntriesByType(filter: EntryType | null) {
  switch (filter) {
    case "All Types":
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (entry: EntryLike) => true;
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      return (entry: EntryLike) => false;
  }
}

export function filterUnpinnedEntries(pinnedEntries: EntryLike[]) {
  return (entry: EntryLike) => pinnedEntries.find((pinnedEntry) => isDeepStrictEqual(pinnedEntry, entry)) === undefined;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "unknown error";
}

export async function fileExists(filename: string): Promise<boolean> {
  return fs.promises
    .access(filename, fs.constants.F_OK)
    .then(() => true)
    .catch(() => false);
}

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function compactNumberFormat(num: number): string {
  return fmt.format(num);
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function waitForFileExists(filename: string, timeoutMs = 2000) {
  const start = new Date();
  while (start.getTime() > 0) {
    await sleep(10);
    if (await fileExists(filename)) {
      return true;
    }
    const end = new Date();
    const delta = end.getTime() - start.getTime();
    if (delta > timeoutMs) {
      return false;
    }
  }
  return false;
}

export function raycastForVSCodeURI(uri: string) {
  return `${getBuildScheme()}://tonka3000.raycast/${uri}`;
}

export async function openURIinVSCode(uri: string) {
  await open(raycastForVSCodeURI(uri));
}
