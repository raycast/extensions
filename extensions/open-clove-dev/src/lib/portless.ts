import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

interface PortlessRoute {
  hostname: string;
  port: number;
  pid: number;
}

export interface WorktreeApp {
  app: string;
  hostname: string;
  url: string;
}

export interface WorktreeInfo {
  name: string;
  apps: WorktreeApp[];
  branch: string | null;
}

const ROUTES_PATH = join(homedir(), ".portless", "routes.json");
const PROXY_PORT = 1355;
const WORKTREES_DIR = join(homedir(), "conductor", "workspaces", "clove");

export async function readRoutes(): Promise<PortlessRoute[]> {
  const content = await readFile(ROUTES_PATH, "utf-8");
  return JSON.parse(content) as PortlessRoute[];
}

async function getWorktreeBranch(worktree: string): Promise<string | null> {
  try {
    const dotGit = await readFile(
      join(WORKTREES_DIR, worktree, ".git"),
      "utf-8",
    );
    const gitdir = dotGit.replace("gitdir: ", "").trim();
    const head = await readFile(join(gitdir, "HEAD"), "utf-8");
    if (head.startsWith("ref: refs/heads/")) {
      return head.replace("ref: refs/heads/", "").trim();
    }
    return head.trim().slice(0, 8);
  } catch {
    return null;
  }
}

export function parseWorktreeApps(
  routes: PortlessRoute[],
  worktree: string,
): WorktreeApp[] {
  return routes
    .filter((route) => {
      const parts = route.hostname.split(".");
      return parts.length >= 2 && parts[1] === worktree;
    })
    .map((route) => ({
      app: route.hostname.split(".")[0],
      hostname: route.hostname,
      url: `http://${route.hostname}:${PROXY_PORT}`,
    }));
}

export async function getActiveWorktrees(
  routes: PortlessRoute[],
): Promise<WorktreeInfo[]> {
  const map = new Map<string, WorktreeApp[]>();
  for (const route of routes) {
    const parts = route.hostname.split(".");
    if (parts.length < 2) continue;
    const worktree = parts[1];
    const entry: WorktreeApp = {
      app: parts[0],
      hostname: route.hostname,
      url: `http://${route.hostname}:${PROXY_PORT}`,
    };
    const existing = map.get(worktree) ?? [];
    existing.push(entry);
    map.set(worktree, existing);
  }

  const results: WorktreeInfo[] = [];
  for (const [name, apps] of map) {
    const branch = await getWorktreeBranch(name);
    results.push({ name, apps, branch });
  }
  return results;
}
