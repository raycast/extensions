export interface App {
  bundleId: string;
  name: string;
}

export interface GitStatus {
  branch: string;
  pull: number;
  push: number;
}

export interface Project {
  fullPath: string;
  gitStatus?: GitStatus | null;
  name: string;
  parentFolder: string;
}
