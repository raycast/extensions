export interface DirectoryInfo {
  id: string;
  name: string;
  alias: string;
  icon: string;
  path: string;
  type: DirectoryType;
  valid: boolean;
  rank: number;
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

export const folderIcons = [
  { title: "Common", value: "light-Folder.png" },
  { title: "Apple", value: "Apple-Folder.png" },
  { title: "Android", value: "Android-Folder.png" },
  { title: "Github", value: "Github-Folder.png" },
  { title: "Google", value: "Google-Folder.png" },
  { title: "Star", value: "Star-Folder.png" },
  { title: "User", value: "User-Folder.png" },
  { title: "Books", value: "Books-Folder.png" },
  { title: "Games", value: "Games-Folder.png" },
  { title: "Music", value: "Music-Folder.png" },
  { title: "Photo", value: "Photo-Folder.png" },
  { title: "ScreenShot", value: "ScreenShot-Folder.png" },
  { title: "Note", value: "Note-Folder.png" },
  { title: "Classroom", value: "Classroom-Folder.png" },
];
