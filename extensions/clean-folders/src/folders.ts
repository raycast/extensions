import { getPreferenceValues } from "@raycast/api";
import { readdir } from "node:fs/promises";
import { homedir } from "node:os";
import { normalize, resolve, sep } from "node:path";

type Preferences = {
  folders: string;
};

export type FolderInspection =
  | {
      path: string;
      label: string;
      status: "found";
      entries: string[];
    }
  | {
      path: string;
      label: string;
      status: "missing";
    };

const ignoredEntries = new Set([".DS_Store", ".localized"]);

function expandHome(path: string): string {
  if (path === "~") {
    return homedir();
  }

  if (path.startsWith(`~${sep}`)) {
    return `${homedir()}${path.slice(1)}`;
  }

  return path;
}

function uniquePaths(paths: string[]): string[] {
  return [...new Set(paths.map((path) => normalize(path)))];
}

export function getConfiguredFolders(): string[] {
  const { folders } = getPreferenceValues<Preferences>();

  return uniquePaths(
    folders
      .split(",")
      .map((path) => path.trim())
      .filter(Boolean)
      .map((path) => resolve(expandHome(path))),
  );
}

export function getLaunchFolders(paths: string[]): string[] {
  return uniquePaths(paths);
}

export function abbreviateHome(path: string): string {
  const userHome = homedir();

  if (path === userHome) {
    return "~";
  }

  return path.startsWith(`${userHome}${sep}`) ? `~${path.slice(userHome.length)}` : path;
}

export async function inspectFolder(path: string): Promise<FolderInspection> {
  const label = abbreviateHome(path);

  try {
    const entries = (await readdir(path)).filter((entry) => !ignoredEntries.has(entry));

    return { path, label, status: "found", entries };
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return { path, label, status: "missing" };
    }

    throw error;
  }
}
