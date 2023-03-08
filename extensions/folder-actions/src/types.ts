export interface FolderAction {
  [key: string]: string | string[];
  type: string;
}

export interface Entry {
  dir: string;
  addActions: FolderAction[];
  removeActions: FolderAction[];
}
