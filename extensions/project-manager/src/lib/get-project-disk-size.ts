import { promisify } from "node:util";
import * as child_process from "node:child_process";
import fs from "node:fs/promises";

const exec = promisify(child_process.exec);

export async function getProjectDiskSize(dir: string) {
  try {
    const stats = await fs.stat(dir);
    if (stats.isFile()) {
      return `${Math.ceil(stats.size / 1024 / 1024)}MB`;
    }

    const { stdout } = await exec("du -sh", {
      cwd: dir,
    });

    // The output is like "1.0M\t/Users/username/Projects/project-name"
    return stdout.trim().split(/\s+/)[0];
  } catch {
    return null;
  }
}
