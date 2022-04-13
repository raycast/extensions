export interface DirectoryInfo {
  id: string;
  name: string;
  path: string;
  type: DirectoryType;
  valid: boolean;
  rank: number;
}

export enum DirectoryType {
  DIRECTORY = "Folder",
  FILE = "File",
}

export enum LocalStorageKey {
  LOCAL_DIRECTORY = "localDirectory",
}

export enum SortBy {
  Rank = "Rank",
  NameUp = "Name+",
  NameDown = "Name-",
}
