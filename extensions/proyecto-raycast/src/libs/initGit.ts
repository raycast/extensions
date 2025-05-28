import { showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

export async function initGit(dir: string) {
  try {
    await promisify(execFile)("git", ["init", "--quiet"], {
      cwd: dir,
    });

    await showToast({
      title: "Initialized with git",
      style: Toast.Style.Success,
    });

    return true;
  } catch (error) {
    await showToast({
      title: "Failed to initialize with git",
      message: error as string,
      style: Toast.Style.Failure,
    });
    return false;
  }
}
