export interface DirectoryInfo {
  id: string;
  name: string;
  alias: string;
  path: string;
  type: DirectoryType;
  valid: boolean;
  rank: number;
  rankSendFile: number;
  isCommon: boolean;
  date: number;
}

export enum DirectoryType {
  DIRECTORY = "Directory",
  FILE = "File",
}

export enum LocalDirectoryKey {
  OPEN_COMMON_DIRECTORY = "open_common_directory",
  SEND_COMMON_DIRECTORY = "send_common_directory",
}

export enum SortBy {
  Rank = "Rank",
  NameUp = "Name+",
  NameDown = "Name-",
}
