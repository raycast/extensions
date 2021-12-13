export interface FileEntry {
  fileUri: string;
}

export function isFileEntry(entry: EntryLike): entry is FileEntry {
  return (entry as FileEntry).fileUri !== undefined;
}

export interface FolderEntry {
  folderUri: string;
}

export function isFolderEntry(entry: EntryLike): entry is FolderEntry {
  return (entry as FolderEntry).folderUri !== undefined;
}

export function isRemoteEntry(entry: EntryLike): entry is FolderEntry {
  return isFolderEntry(entry) && entry.folderUri.startsWith("vscode-remote://");
}

export interface WorkspaceEntry {
  workspace: {
    configPath: string;
  };
}

export function isWorkspaceEntry(entry: EntryLike): entry is WorkspaceEntry {
  return (
    (entry as WorkspaceEntry).workspace !== undefined && (entry as WorkspaceEntry).workspace.configPath !== undefined
  );
}

export type EntryLike = FolderEntry | FileEntry | WorkspaceEntry;
