import type { Project } from "../types/project";
import fs from "node:fs/promises";
import path from "node:path";

import { getProjectGitBranch } from "./get-project-git-branch";
import { getStats } from "./get-stats";
import { formatBytes } from "./format-bytes";

export async function getProjects(directory: string, excludePatterns: string[]): Promise<Project[]> {
  const directories = await fs.readdir(directory);
  const projects = await Promise.all(
    directories
      .filter((filename) => !filename.startsWith("."))
      .map(async (filename): Promise<Project> => {
        const archived = filename.endsWith(".tar.bz2");
        const pathname = path.join(directory, filename);

        const [stats, gitBranch] = await Promise.all([
          getStats(pathname, excludePatterns),
          getProjectGitBranch(pathname),
        ]);

        return {
          id: filename,
          filename,
          pathname,
          lastModifiedTime: new Date(stats.lastModifiedTime),
          gitBranch,
          diskSize: formatBytes(stats.totalSize),
          archived,
        } satisfies Project;
      }),
  );

  // Sort by last modified time.
  projects.sort((a, b) => b.lastModifiedTime.getTime() - a.lastModifiedTime.getTime());

  return projects;
}
