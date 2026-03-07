import { Application } from "@raycast/api";

export interface Preferences {
  projectPaths: string;
  editorApp: Application;
  editorAppAlt: Application;
  terminalApp: Application;
  maxParallelProcesses: string;
}

export type RepoStatus = "idle" | "pulling" | "updated" | "up-to-date" | "dirty" | "error";

export interface Repo {
  name: string;
  path: string;
  status: RepoStatus;
  branch: string;
  error?: string;
}

export interface ProjectGroup {
  name: string;
  path: string;
}
