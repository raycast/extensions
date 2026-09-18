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

function isWorkspaceSummary(value: unknown): value is WorkspaceSummary {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const summary = value as Partial<WorkspaceSummary>;
  return (
    typeof summary.id === "string" &&
    typeof summary.name === "string" &&
    typeof summary.icon === "string" &&
    typeof summary.accentHex === "string" &&
    typeof summary.updatedAt === "string" &&
    typeof summary.appCount === "number" &&
    typeof summary.windowCount === "number" &&
    typeof summary.displayCount === "number"
  );
}

function isMissingSummaryIndex(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "ENOENT"
  );
}

export async function readWorkspaceSummaries(): Promise<WorkspaceSummary[]> {
  try {
    const contents = await readFile(SUMMARY_PATH, "utf8");
    const summaries: unknown = JSON.parse(contents);
    if (!Array.isArray(summaries) || !summaries.every(isWorkspaceSummary)) {
      throw new Error("The SnapState workspace index has an invalid format.");
    }

    return summaries.sort((left, right) => left.name.localeCompare(right.name));
  } catch (error) {
    if (!isMissingSummaryIndex(error)) {
      throw new Error("The SnapState workspace index is unreadable.", { cause: error });
    }

    return [];
  }
}

export function createSnapStateURL(command: string, parameters: Record<string, string> = {}): string {
  // URLSearchParams form-encodes spaces as `+`, which custom URL schemes may
  // treat as a literal plus. Emit `%20` so SnapState decodes every name back
  // to the exact string the user typed.
  const query = new URLSearchParams(parameters).toString().replace(/\+/g, "%20");
  return query ? `snapstate://${command}?${query}` : `snapstate://${command}`;
}

export async function openSnapState(command: string, parameters: Record<string, string> = {}): Promise<void> {
  await open(createSnapStateURL(command, parameters));
}

export function pluralize(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

export function workspaceAccessory(workspace: WorkspaceSummary): string {
  const apps = pluralize(workspace.appCount, "app");
  const displays = pluralize(workspace.displayCount, "display");
  return `${apps} · ${displays}`;
}
