import { Image } from "@raycast/api";

export interface Remote {
  url: string;
}

export type BareRepository = {
  name: string;
  displayPath: string;
  fullPath: string;
  pathParts: string[];
  primaryDirectory: string;
  gitRemotes: Repo[];
};

export type Worktree = {
  id: string;
  path: string;
  commit: string | null;
  branch: string | null;
  dirty: boolean;
};

export type Project = BareRepository & {
  id: string;
  worktrees: Worktree[];
};

export interface Repo {
  name: string;
  host: string;
  hostDisplayName: string;
  url: string;
  icon: Image;
}
