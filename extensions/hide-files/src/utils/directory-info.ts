import { homedir } from "os";

export interface DirectoryInfo {
  id: string;
  name: string;
  path: string;
  valid: boolean;
  type: DirectoryType;
  date: number;
}

export enum DirectoryType {
  DIRECTORY = "Directory",
  FILE = "File",
}

export const tagDirectoryType = [
  { title: "Folder", value: `Directory` },
  { title: "File", value: `File` },
];
export const tagDirectoryPath = [
  { title: "Desktop", value: `${homedir()}/Desktop` },
  { title: "Documents", value: `${homedir()}/Documents` },
  { title: "Movies", value: `${homedir()}/Movies` },
  { title: "Music", value: `${homedir()}/Music` },
  { title: "Pictures", value: `${homedir()}/Pictures` },
  { title: "Downloads", value: `${homedir()}/Downloads` },
];
