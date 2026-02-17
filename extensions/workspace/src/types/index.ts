export interface GitStatus {
  branch: string;
  pull?: number;
  push?: number;
}

export interface Project {
  name: string;
  fullPath: string;
  parentFolder: string;
  gitStatus?: GitStatus | null;
}

export interface App {
  name: string;
  bundleId: string;
}
