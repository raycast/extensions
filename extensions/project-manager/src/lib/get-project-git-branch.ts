import { promisify } from "node:util";
import * as child_process from "node:child_process";
import path from "node:path";

import { exists } from "./exists";

const exec = promisify(child_process.exec);
export async function getProjectGitBranch(dir: string) {
  try {
    if (!exists(path.join(dir, ".git"))) {
      return null;
    }

    const { stdout } = await exec("git rev-parse --abbrev-ref HEAD", {
      cwd: dir,
    });

    return stdout.trim();
  } catch {
    return null;
  }
}
