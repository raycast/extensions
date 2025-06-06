export interface WindsurfProject {
  name: string;
  path: string;
  lastOpened: Date;
  type: "file" | "folder";
}

export interface ProjectStorage {
  projects: WindsurfProject[];
}
