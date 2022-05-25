import { existsSync } from "fs";
import { URL } from "url";

export interface FileEntry {
  fileUri: string;
}

export function isFileEntry(entry: EntryLike): entry is FileEntry {
  const { fileUri } = entry as FileEntry;
  return fileUri !== undefined && existsSync(new URL(fileUri)) && fileUri.indexOf(".code-workspace") === -1;
}

export interface FolderEntry {
  folderUri: string;
}

export function isFolderEntry(entry: EntryLike): entry is FolderEntry {
  const { folderUri } = entry as FolderEntry;
  return folderUri !== undefined && existsSync(new URL(folderUri));
}

export interface WorkspaceEntry {
  workspace: {
    configPath: string;
  };
}

export function isWorkspaceEntry(entry: EntryLike): entry is WorkspaceEntry {
  const { workspace } = entry as WorkspaceEntry;

  return (
    workspace !== undefined &&
    existsSync(new URL(workspace.configPath)) &&
    workspace.configPath.indexOf(".code-workspace") !== -1
  );
}

export interface RemoteEntry {
  folderUri: string;
  remoteAuthority: string;
  label: string;
}

export function isRemoteEntry(entry: EntryLike): entry is RemoteEntry {
  const { folderUri, remoteAuthority } = entry as RemoteEntry;
  return folderUri !== undefined && remoteAuthority !== undefined;
}

export type EntryLike = FolderEntry | FileEntry | WorkspaceEntry | RemoteEntry;

export enum VSCodeBuild {
  Code = "Code",
  Insiders = "Code - Insiders",
}

export interface Preferences {
  build: VSCodeBuild;
}
