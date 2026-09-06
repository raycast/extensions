import { open } from "@raycast/api";
import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

export type WorkspaceSummary = {
  id: string;
  name: string;
  icon: string;
  accentHex: string;
  updatedAt: string;
  appCount: number;
  windowCount: number;
  displayCount: number;
};

export const SNAPSTATE_DOWNLOAD_URL =
  "https://getsnapstate.com/?utm_source=raycast&utm_medium=extension&utm_campaign=raycast-install";

const SUMMARY_PATH = join(
  homedir(),
  "Library",
  "Application Support",
  "SnapState",
  "raycast-workspaces.json",
);

export async function readWorkspaceSummaries(): Promise<WorkspaceSummary[]> {
  try {
    const contents = await readFile(SUMMARY_PATH, "utf8");
    const summaries = JSON.parse(contents) as WorkspaceSummary[];
    return summaries.sort((left, right) => left.name.localeCompare(right.name));
  } catch {
    return [];
  }
}

export function createSnapStateURL(command: string, parameters: Record<string, string> = {}): string {
  const url = new URL(`snapstate://${command}`);
  for (const [key, value] of Object.entries(parameters)) {
    url.searchParams.set(key, value);
  }
  return url.toString();
}

export async function openSnapState(command: string, parameters: Record<string, string> = {}): Promise<void> {
  await open(createSnapStateURL(command, parameters));
}

export function workspaceAccessory(workspace: WorkspaceSummary): string {
  const apps = `${workspace.appCount} app${workspace.appCount === 1 ? "" : "s"}`;
  const displays = `${workspace.displayCount} display${workspace.displayCount === 1 ? "" : "s"}`;
  return `${apps} · ${displays}`;
}
