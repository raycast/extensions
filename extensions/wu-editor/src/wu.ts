import { Application, getApplications, getPreferenceValues } from "@raycast/api";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export type WorkspaceRow = {
  workspace_id: number;
  paths: string;
  paths_order: string;
  timestamp: string;
};

export type Project = {
  id: number;
  paths: string[];
  title: string;
  subtitle: string;
  lastOpened: Date;
};

export const WORKSPACES_QUERY = `
  SELECT workspace_id, paths, paths_order, timestamp
  FROM workspaces
  WHERE remote_connection_id IS NULL AND paths IS NOT NULL AND paths != ''
  ORDER BY timestamp DESC
`;

const WU_BUNDLE_ID = "me.farshed.Wu";

export function expandHome(path: string): string {
  if (path === "~") {
    return homedir();
  }
  return path.startsWith("~/") ? resolve(homedir(), path.slice(2)) : path;
}

export function collapseHome(path: string): string {
  const home = homedir();
  return path.startsWith(home) ? `~${path.slice(home.length)}` : path;
}

export function databasePath(): string {
  return expandHome(getPreferenceValues<Preferences>().databasePath);
}

export function cliPath(): string {
  return expandHome(getPreferenceValues<Preferences>().cliPath);
}

export function configDir(): string {
  return expandHome(getPreferenceValues<Preferences>().configDir);
}

export function extensionsDir(): string {
  return expandHome(getPreferenceValues<Preferences>().extensionsDir);
}

export function toProject(row: WorkspaceRow): Project | undefined {
  const sortedPaths = row.paths.split("\n");
  const order = (row.paths_order ?? "")
    .split(",")
    .map((index) => Number(index))
    .filter((index) => Number.isInteger(index) && index >= 0 && index < sortedPaths.length);
  const paths = (order.length === sortedPaths.length ? order.map((index) => sortedPaths[index]) : sortedPaths).filter(
    existsSync,
  );
  if (paths.length === 0) {
    return undefined;
  }
  return {
    id: row.workspace_id,
    paths,
    title: paths.map((path) => basename(path)).join(" · "),
    subtitle: collapseHome(paths.length === 1 ? dirname(paths[0]) : paths[0]),
    lastOpened: new Date(`${row.timestamp.replace(" ", "T")}Z`),
  };
}

async function wuApp(): Promise<Application | undefined> {
  const applications = await getApplications();
  return (
    applications.find((application) => application.bundleId === WU_BUNDLE_ID) ??
    applications.find((application) => application.name === "Wu")
  );
}

async function wuCli(): Promise<string | undefined> {
  const preferred = cliPath();
  if (existsSync(preferred)) {
    return preferred;
  }
  const application = await wuApp();
  const bundled = application && join(application.path, "Contents/MacOS/cli");
  return bundled && existsSync(bundled) ? bundled : undefined;
}

export async function openInWu(paths: string[], newWindow: boolean): Promise<void> {
  const cli = await wuCli();
  if (cli) {
    await run(cli, [...(newWindow ? ["-n"] : []), ...paths]);
    return;
  }
  const application = await wuApp();
  if (!application) {
    throw new Error("Wu is not installed.");
  }
  await run("open", ["-a", application.path, ...paths]);
}

export async function openConfigFile(name: string): Promise<void> {
  await openInWu([resolve(configDir(), name)], false);
}
