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

export interface TypeDirectory {
  type: string;
  directories: DirectoryWithFileInfo[];
}

export enum TypeDirectoryEnum {
  OpenFolder = "Open Folder",
  PinnedFolder = "Pinned Folder",
}

export enum FileType {
  FOLDER = "Folder",
  FILE = "File",
  IMAGE = "Image",
}

export enum DirectoryType {
  FOLDER = "Folder",
  FILE = "File",
}

export enum Layout {
  GRID = "Grid",
  LIST = "List",
}
