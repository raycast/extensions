export type FileEntry = {
  fileUri: string;
};

export type FolderEntry = {
  folderUri: string;
};

export type WorkspaceEntry = {
  workspace: {
    configPath: string;
  };
};

export type RemoteEntry = {
  folderUri: string;
  remoteAuthority: string;
  label: string;
};

export type RemoteWorkspaceEntry = {
  workspace: {
    configPath: string;
  };
  remoteAuthority: string;
  label?: string;
};

export type EntryLike =
  | FolderEntry
  | FileEntry
  | WorkspaceEntry
  | RemoteEntry
  | RemoteWorkspaceEntry;

export type RecentEntries = {
  entries: string;
};

export const EntryType = {
  Workspaces: "Workspaces",
  Folders: "Folders",
  RemoteFolders: "Remote Folders",
  RemoteWorkspace: "Remote Workspace",
  Files: "Files",
  AllTypes: "All Types",
} as const;

export type EntryType = (typeof EntryType)[keyof typeof EntryType];
