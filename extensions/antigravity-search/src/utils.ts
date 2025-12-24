/// <reference types="../raycast-env.d.ts" />

import type { Project } from "./types";
import fs from "fs/promises";
import { homedir } from "os";
import path from "path";
import relativeTime from "dayjs/plugin/relativeTime";
import dayjs from "dayjs";
import { getPreferenceValues, showHUD, showToast, Toast } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import {
  IGNORED_FOLDERS_PATTERN,
  getAgyCommandPath,
  getDefaultSearchFolder,
} from "./config";

const execAsync = promisify(exec);

export function getRelativeTime(timestamp: number) {
  dayjs.extend(relativeTime);
  return dayjs().to(dayjs(timestamp));
}

export async function getLastModifiedTime(path: string): Promise<number> {
  try {
    const stats = await fs.stat(path);
    return stats.mtimeMs;
  } catch {
    return -1;
  }
}

export function expandPath(inputPath: string): string {
  return inputPath.replace(/^~/, homedir());
}

export async function openInAntigravity(projectPath: string): Promise<void> {
  try {
    const agyPath = getAgyCommandPath();
    await execAsync(`${agyPath} -n "${projectPath}"`);
    await showHUD(`Opening ${path.basename(projectPath)} with Antigravity`);
  } catch (error) {
    console.error("Error opening with Antigravity:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to open with Antigravity",
      message: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function loadProjects(): Promise<Project[]> {
  try {
    const { projectsDirectory, searchDepth } =
      getPreferenceValues<Preferences>();
    const searchFolder = projectsDirectory || getDefaultSearchFolder();

    const expandedPath = expandPath(searchFolder);
    const depth = parseInt(searchDepth || "3", 10);
    const maxDepth = Math.min(Math.max(depth, 1), 5);

    const projects = await findProjects(expandedPath, maxDepth);
    return projects.sort(
      (a, b) => (b.lastModifiedTime ?? 0) - (a.lastModifiedTime ?? 0),
    );
  } catch (error) {
    console.error("Error loading projects:", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to load projects",
      message: String(error),
    });
    return [];
  }
}

async function findProjects(
  dirPath: string,
  maxDepth: number,
): Promise<Project[]> {
  if (maxDepth === 0) return [];

  const projects: Project[] = [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory() && !IGNORED_FOLDERS_PATTERN.test(entry.name)) {
        const fullPath = path.join(dirPath, entry.name);
        const lastModifiedTime = await getLastModifiedTime(fullPath);

        projects.push({
          name: entry.name,
          path: fullPath,
          lastModifiedTime,
        });

        if (maxDepth > 1) {
          const subProjects = await findProjects(fullPath, maxDepth - 1);
          projects.push(...subProjects);
        }
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dirPath}:`, error);
  }

  return projects;
}
