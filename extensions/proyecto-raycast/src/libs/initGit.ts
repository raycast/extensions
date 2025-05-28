import { showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
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
    await showFailureToast(error, {
      title: "Failed to initialize with git",
    });
    return false;
  }
}
