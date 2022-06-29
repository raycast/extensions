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
  type: FileType;
  modifyTime: number;
}

export interface FolderPageItem {
  name: string;
  isFolder: boolean;
}

export interface DirectoryWithFileInfo {
  directory: DirectoryInfo;
  files: FileInfo[];
}

export enum FileType {
  FOLDER = "Folder",
  FILE = "File",
  IMAGE = "Image",
}
export enum DirectoryType {
  DIRECTORY = "Directory",
  FILE = "File",
}
