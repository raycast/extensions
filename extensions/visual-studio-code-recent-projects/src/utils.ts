import { open } from "@raycast/api";
import * as fs from "fs";
import { existsSync } from "fs";
import { URL, fileURLToPath } from "url";
import { isDeepStrictEqual } from "util";
import { getBuildScheme } from "./lib/vscode";
import {
  EntryLike,
  EntryType,
  FileEntry,
  FolderEntry,
  RemoteEntry,
  RemoteWorkspaceEntry,
  WorkspaceEntry,
} from "./types";

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

export function isRemoteLikeEntry(entry: EntryLike): entry is RemoteEntry | RemoteWorkspaceEntry {
  return isRemoteEntry(entry) || isRemoteWorkspaceEntry(entry);
}

export function isSameEntry(a: EntryLike, b: EntryLike) {
  if ("fileUri" in a && "fileUri" in b) {
    return a.fileUri === b.fileUri;
  }

  if ("folderUri" in a && "folderUri" in b) {
    return a.folderUri === b.folderUri;
  }

  if ("workspace" in a && "workspace" in b) {
    return a.workspace.configPath === b.workspace.configPath;
  }

  return false;
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

export function isValidHexColor(color: string): boolean {
  return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

export function buildEntryKeywords(entry: EntryLike, uri: string): string[] {
  const keywords = new Set<string>();
  const add = (value?: string) => addKeywordValue(keywords, value);

  add(uri);

  if (isRemoteLikeEntry(entry)) {
    add(entry.remoteAuthority);
    entry.remoteAuthority.split("+").filter(Boolean).forEach(add);
    add(entry.label);
    add(entry.remoteAuthority.split("+").slice(1).join("+"));
    if ("folderUri" in entry) {
      add(entry.folderUri);
    }
    addUriParts(keywords, uri);
    if ("workspace" in entry) {
      add(entry.workspace.configPath);
    }
  } else {
    let path: string | undefined;
    if (uri) {
      try {
        path = fileURLToPath(uri);
      } catch {
        path = undefined;
      }
    }
    add(path);
    if (isWorkspaceEntry(entry)) {
      add(entry.workspace.configPath);
    }
    if (isFolderEntry(entry)) {
      add(entry.folderUri);
    }
    if (isFileEntry(entry)) {
      add(entry.fileUri);
    }
  }

  return Array.from(keywords).filter(Boolean);
}

function addKeywordValue(keywords: Set<string>, raw?: string) {
  if (!raw) {
    return;
  }

  let value: string;
  try {
    value = decodeURIComponent(raw).trim();
  } catch {
    value = raw.trim();
  }

  if (!value) {
    return;
  }

  keywords.add(value);
  const lower = value.toLowerCase();
  if (lower !== value) {
    keywords.add(lower);
  }

  value
    .split(/[^a-zA-Z0-9]+/)
    .map((segment) => segment.trim())
    .filter(Boolean)
    .forEach((segment) => keywords.add(segment));
}

function addUriParts(keywords: Set<string>, raw: string) {
  try {
    const parsed = new URL(raw);
    [parsed.href, parsed.host, parsed.hostname, parsed.pathname].forEach((value) => addKeywordValue(keywords, value));
  } catch {
    addKeywordValue(keywords, raw);
  }
}
