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

export type EntryLike = FolderEntry | FileEntry | WorkspaceEntry | RemoteEntry;

export enum VSCodeBuild {
  Code = "Code",
  Insiders = "Code - Insiders",
  VSCodium = "VSCodium",
}

export type Preferences = {
  build: VSCodeBuild;
  keepSectionOrder: boolean;
  layout: "grid" | "list";
  closeOtherWindows: boolean;
};

export type RecentEntries = {
  entries: string;
};

export enum EntryType {
  Workspaces = "Workspaces",
  Folders = "Folders",
  RemoteFolders = "Remote Folders",
  Files = "Files",
  AllTypes = "All Types",
}

export type PinnedMovement = "up" | "right" | "down" | "left";

export type PinMethods = {
  pin: (entry: EntryLike) => void;
  moveUp: (entry: EntryLike) => void;
  moveDown: (entry: EntryLike) => void;
  unpin: (entry: EntryLike) => void;
  unpinAll: () => void;
  getAllowedMovements: (entry: EntryLike) => PinnedMovement[];
};
