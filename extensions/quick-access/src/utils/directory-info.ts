export interface DirectoryInfo {
  id: string;
  name: string;
  path: string;
  type: DirectoryType;
  valid: boolean;
  rank: number;
  date: number;
}
export interface FileInfo {
  id: string;
  name: string;
  path: string;
  type: DirectoryType;
  modifyTime: number;
}

export interface DirectoryWithFileInfo {
  directory: DirectoryInfo;
  files: FileInfo[];
}

export enum DirectoryType {
  DIRECTORY = "Directory",
  FILE = "File",
}
