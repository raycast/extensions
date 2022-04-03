export interface DirectoryInfo {
  id: string;
  name: string;
  alias: string;
  path: string;
  type: DirectoryType;
  valid: boolean;
  rank: number;
  isCommon: boolean;
}

export enum DirectoryType {
  DIRECTORY = "Directory",
  FILE = "File",
}
export enum SortBy {
  Rank = "Rank",
  NameUp = "Name+",
  NameDown = "Name-",
}
