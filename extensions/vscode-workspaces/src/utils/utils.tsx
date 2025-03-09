import * as fs from "fs/promises";
import * as path from "path";

import { LocalStorage } from "@raycast/api";

import type { Favorite } from "./types";

export async function findWorkspaceFiles(dir: string): Promise<string[]> {
  const ignoredDirectories = [
    "node_modules",
    "Library",
    ".git",
    "dist",
    "build",
    "out",
    "tmp",
    "temp",
    "cache",
    "Applications",
    "Downloads",
    "Movies",
    "Music",
    "Pictures",
  ];

  if (ignoredDirectories.some((ignoredDir) => dir.endsWith(path.sep + ignoredDir))) {
    return [];
  }

  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    let files: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(await findWorkspaceFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith(".code-workspace")) {
        files.push(fullPath);
      }
    }

    return files;
  } catch {
    return [];
  }
}

export async function getFavorites(): Promise<Favorite[]> {
  return Object.entries(await LocalStorage.allItems()).map(([title, path]) => ({ title, path }));
}

export function getWorkspaceName(path: string): string {
  const name = path.split("/").pop();
  const workspaceName = name?.replace(".code-workspace", "");
  return workspaceName || "n/a";
}
