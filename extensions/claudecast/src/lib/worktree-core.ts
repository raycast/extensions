import path from "path";

export interface GitWorktreeRecord {
  path: string;
  head?: string;
  branch?: string;
  detached: boolean;
  bare: boolean;
  locked: boolean;
  lockReason?: string;
  prunable: boolean;
  pruneReason?: string;
  isMain: boolean;
}

export interface WorktreeStatus {
  staged: number;
  modified: number;
  untracked: number;
  conflicted: number;
  paths: string[];
  isClean: boolean;
}

export interface WorktreeRemovalDecision {
  allowed: boolean;
  reason?: string;
}

export function parseGitWorktreePorcelain(output: string): GitWorktreeRecord[] {
  const records: GitWorktreeRecord[] = [];
  let current: Partial<GitWorktreeRecord> | undefined;
  const finish = () => {
    if (!current || typeof current.path !== "string" || !current.path) {
      current = undefined;
      return;
    }
    records.push({
      path: current.path,
      head: current.head,
      branch: current.branch,
      detached: current.detached ?? false,
      bare: current.bare ?? false,
      locked: current.locked ?? false,
      lockReason: current.lockReason,
      prunable: current.prunable ?? false,
      pruneReason: current.pruneReason,
      isMain: records.length === 0,
    });
    current = undefined;
  };

  for (const field of output.split("\0")) {
    if (!field) {
      finish();
      continue;
    }
    const separator = field.indexOf(" ");
    const key = separator < 0 ? field : field.slice(0, separator);
    const value = separator < 0 ? "" : field.slice(separator + 1);
    if (key === "worktree") {
      finish();
      current = { path: value };
      continue;
    }
    if (!current) continue;
    switch (key) {
      case "HEAD":
        if (/^[0-9a-f]{40,64}$/i.test(value)) current.head = value;
        break;
      case "branch":
        current.branch = value.startsWith("refs/heads/")
          ? value.slice("refs/heads/".length)
          : value;
        break;
      case "detached":
        current.detached = true;
        break;
      case "bare":
        current.bare = true;
        break;
      case "locked":
        current.locked = true;
        current.lockReason = value || undefined;
        break;
      case "prunable":
        current.prunable = true;
        current.pruneReason = value || undefined;
        break;
    }
  }
  finish();
  return records;
}

export function parseGitStatusPorcelain(output: string): WorktreeStatus {
  let staged = 0;
  let modified = 0;
  let untracked = 0;
  let conflicted = 0;
  const paths: string[] = [];
  const fields = output.split("\0");

  for (let index = 0; index < fields.length; index++) {
    const field = fields[index];
    if (!field || field.length < 3) continue;
    const x = field[0];
    const y = field[1];
    const filePath = field.slice(3);
    paths.push(filePath);
    if (x === "?" && y === "?") {
      untracked++;
      continue;
    }
    if (
      x === "U" ||
      y === "U" ||
      (x === "A" && y === "A") ||
      (x === "D" && y === "D")
    ) {
      conflicted++;
    }
    if (x !== " " && x !== "?") staged++;
    if (y !== " " && y !== "?") modified++;
    if (x === "R" || x === "C") {
      const originalPath = fields[index + 1];
      if (originalPath) {
        paths.push(originalPath);
        index++;
      }
    }
  }
  return {
    staged,
    modified,
    untracked,
    conflicted,
    paths: paths.slice(0, 100),
    isClean:
      staged === 0 && modified === 0 && untracked === 0 && conflicted === 0,
  };
}

export function canRemoveWorktree(
  worktree: GitWorktreeRecord,
  status: WorktreeStatus | undefined,
): WorktreeRemovalDecision {
  if (worktree.isMain) {
    return { allowed: false, reason: "The Main Worktree Cannot Be Removed" };
  }
  if (worktree.bare) {
    return { allowed: false, reason: "A Bare Worktree Cannot Be Removed Here" };
  }
  if (worktree.locked) {
    return {
      allowed: false,
      reason: "Unlock This Worktree Before Removing It",
    };
  }
  if (worktree.prunable) {
    return {
      allowed: false,
      reason: "Prune This Missing Worktree from the Repository",
    };
  }
  if (!status) {
    return {
      allowed: false,
      reason: "Worktree Status Is Unavailable",
    };
  }
  if (!status.isClean) {
    return {
      allowed: false,
      reason: "Commit, Stash, or Remove Worktree Changes First",
    };
  }
  return { allowed: true };
}

export function worktreePathIdentity(
  value: string,
  platform: NodeJS.Platform = process.platform,
): string {
  const pathApi = platform === "win32" ? path.win32 : path.posix;
  const normalized = pathApi.resolve(value);
  return platform === "win32" ? normalized.toLocaleLowerCase() : normalized;
}

export function buildWorktreeCommand(
  action: "lock" | "unlock" | "remove",
  worktreePath: string,
  lockReason?: string,
): string[] {
  if (action === "lock") {
    return [
      "worktree",
      "lock",
      ...(lockReason ? ["--reason", lockReason] : []),
      "--",
      worktreePath,
    ];
  }
  return ["worktree", action, "--", worktreePath];
}

export function formatPrunePreview(stdout: string, stderr: string): string {
  return [stdout.trim(), stderr.trim()].filter(Boolean).join("\n");
}

export function assertPrunePreviewParity(
  expectedPreview: string,
  currentPreview: string,
): void {
  if (
    !currentPreview.trim() ||
    currentPreview.trim() !== expectedPreview.trim()
  ) {
    throw new Error(
      "The Prunable Worktree Set Changed, Refresh and Review It Again",
    );
  }
}

export function createTaskLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  const runNext = () => {
    while (active < concurrency && queue.length > 0) {
      active++;
      queue.shift()?.();
    }
  };

  return function limit<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      queue.push(() => {
        void task()
          .then(resolve, reject)
          .finally(() => {
            active--;
            runNext();
          });
      });
      runNext();
    });
  };
}
