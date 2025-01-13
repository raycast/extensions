import * as child_process from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

import { getStats } from "./get-stats";

const exec = promisify(child_process.exec);

export async function archiveProject(pathname: string, excludePatterns: string[]) {
  const excludeArgs = excludePatterns.map((pattern) => `--exclude='*/${pattern}/*'`).join(" ");

  const { lastModifiedTime, lastAccessTime } = await getStats(pathname, excludePatterns);

  const basename = path.basename(pathname);
  const archivePath = `${basename}.tar.bz2`;
  const projectsDir = path.dirname(pathname);

  await exec(`tar -cjf ${archivePath} ${excludeArgs} ${basename}`, {
    cwd: projectsDir,
  });

  // Set the last modified time to the original time.
  await fs.utimes(path.join(projectsDir, archivePath), lastAccessTime / 1000, lastModifiedTime / 1000);

  await exec(`rm -rf ${pathname}`, {
    cwd: projectsDir,
  });

  return archivePath;
}
