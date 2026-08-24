import type { RepoStatus } from "./types";

/** Parse `git status --porcelain=v2 --branch` output. */
export function parseStatus(output: string, stashes: number): RepoStatus {
  const status: RepoStatus = {
    branch: "",
    detached: false,
    ahead: 0,
    behind: 0,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    conflicted: 0,
    stashes,
  };
  for (const line of output.split("\n")) {
    if (line.startsWith("# branch.head ")) {
      status.branch = line.slice("# branch.head ".length);
      status.detached = status.branch === "(detached)";
    } else if (line.startsWith("# branch.upstream ")) {
      status.upstream = line.slice("# branch.upstream ".length);
    } else if (line.startsWith("# branch.ab ")) {
      const match = /\+(\d+) -(\d+)/.exec(line);
      if (match) {
        status.ahead = Number.parseInt(match[1], 10);
        status.behind = Number.parseInt(match[2], 10);
      }
    } else if (line.startsWith("1 ") || line.startsWith("2 ")) {
      const xy = line.split(" ")[1] ?? "..";
      if (xy[0] !== ".") status.staged++;
      if (xy[1] !== ".") status.unstaged++;
    } else if (line.startsWith("? ")) {
      status.untracked++;
    } else if (line.startsWith("u ")) {
      status.conflicted++;
    }
  }
  return status;
}

export function totalChanges(status: RepoStatus): number {
  return status.staged + status.unstaged + status.untracked + status.conflicted;
}

export function isClean(status: RepoStatus): boolean {
  return totalChanges(status) === 0;
}

export function isInSync(status: RepoStatus): boolean {
  return status.ahead === 0 && status.behind === 0;
}
