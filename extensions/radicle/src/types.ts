export interface Project {
  name: string;
  description: string;
  defaultBranch: string;
  delegates: { id: string; alias?: string }[];
  threshold: number;
  visibility: { type: "private" | "public" };
  head: string;
  patches: { open: number; draft: number; archived: number; merged: number };
  issues: { open: number; closed: number };
  id: string;
  seeding: number;
}

export interface Blob {
  binary: false;
  name: string;
  content: string;
  path: string;
  lastCommit: {
    id: string;
    author: {
      name: string;
      email: string;
    };
    summary: string;
    description: string;
    parents: string[];
    committer: {
      name: string;
      email: string;
      time: number;
    };
  };
}
