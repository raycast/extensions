import { GitStatus } from "../utils/git";

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

export type { GitStatus };
