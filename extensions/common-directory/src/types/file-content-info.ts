export interface FileContentInfo {
  fileContent: string;
  name: string;
  where: string;
  sizeTitle: string;
  size: string;
  created: string;
  modified: string;
  lastOpened: string;
}

export interface FolderPageItem {
  name: string;
  isFolder: boolean;
}
