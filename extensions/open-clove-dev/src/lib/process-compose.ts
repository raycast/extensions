import { execSync } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const WORKTREES_DIR = join(homedir(), "conductor", "workspaces", "clove");

export interface ProcessComposeInstance {
  pid: number;
  worktree: string;
}

export function getProcessComposeInstances(): ProcessComposeInstance[] {
  try {
    const pids = execSync("pgrep -f 'process-compose up'", {
      encoding: "utf-8",
    })
      .trim()
      .split("\n")
      .filter(Boolean)
      .map(Number);

    const instances: ProcessComposeInstance[] = [];

    for (const pid of pids) {
      try {
        const output = execSync(`lsof -a -d cwd -p ${pid} -Fn`, {
          encoding: "utf-8",
          stdio: ["pipe", "pipe", "ignore"],
        });
        const cwdLine = output.split("\n").find((l) => l.startsWith("n"));
        if (!cwdLine) continue;
        const cwd = cwdLine.slice(1);

        if (cwd.startsWith(WORKTREES_DIR + "/")) {
          const worktree = cwd.slice(WORKTREES_DIR.length + 1).split("/")[0];
          if (worktree) {
            instances.push({ pid, worktree });
          }
        }
      } catch {
        continue;
      }
    }

    return instances;
  } catch {
    return [];
  }
}

export function stopWorktree(worktree: string): boolean {
  const instances = getProcessComposeInstances();
  const instance = instances.find((i) => i.worktree === worktree);
  if (!instance) return false;

  try {
    process.kill(instance.pid, "SIGTERM");
    return true;
  } catch {
    return false;
  }
}
