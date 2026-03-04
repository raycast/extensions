import { execFileSync, execFile } from "child_process";
import { existsSync } from "fs";
import { getPreferenceValues, LocalStorage } from "@raycast/api";

const DEFAULT_CLI = "/Applications/Hubstaff.app/Contents/MacOS/HubstaffCLI";

export function getCLIPath(): string {
  const prefs = getPreferenceValues<Preferences>();
  return prefs.cliPath?.trim() || DEFAULT_CLI;
}

export function ensureHubstaffInstalled(): void {
  if (!existsSync(getCLIPath())) {
    throw new Error(
      "Hubstaff CLI not found. Check the path in extension preferences or install Hubstaff from https://hubstaff.com/",
    );
  }
}
export const PROJECTS_CACHE_KEY = "hubstaff-projects-cache";
export const PROJECTS_CACHE_TIME_KEY = "hubstaff-projects-cache-time";
export const STATUS_CACHE_KEY = "hubstaff-status-cache";

export interface Project {
  id: number;
  name: string;
  organization_name: string;
  requires_task: boolean;
}

export interface Task {
  id: number;
  summary: string;
}

export interface Status {
  active_project?: { id: number; name: string; tracked_today: string };
  tracking: boolean;
}

export function hubstaff(args: string[]): string {
  const cli = getCLIPath();
  try {
    return execFileSync(cli, args, { timeout: 5000 }).toString().trim();
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; stderr?: Buffer };
    return (
      err.stdout?.toString() ||
      err.stderr?.toString() ||
      String(e)
    ).trim();
  }
}

export function getStatusAsync(): Promise<Status> {
  const cli = getCLIPath();
  return new Promise((resolve) => {
    execFile(cli, ["status"], { timeout: 5000 }, (err, stdout) => {
      if (err || !stdout) {
        resolve({ tracking: false });
        return;
      }
      try {
        resolve(JSON.parse(stdout.toString().trim()));
      } catch {
        resolve({ tracking: false });
      }
    });
  });
}

export function fetchProjects(): Project[] {
  try {
    const orgs = JSON.parse(hubstaff(["organizations"]));
    const orgId = orgs.organizations?.[0]?.id;
    if (!orgId) return [];
    const result = JSON.parse(hubstaff(["projects", String(orgId)]));
    return result.projects ?? [];
  } catch {
    return [];
  }
}

export function getTasks(projectId: number): Task[] {
  try {
    const result = JSON.parse(hubstaff(["tasks", String(projectId)]));
    return result.tasks ?? [];
  } catch {
    return [];
  }
}

export function formatCacheAge(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export async function getCacheTimestamp(): Promise<number | null> {
  const raw = await LocalStorage.getItem<string>(PROJECTS_CACHE_TIME_KEY);
  return raw ? Number(raw) : null;
}
