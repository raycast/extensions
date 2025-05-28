import { showToast, Toast } from "@raycast/api";
import { existsSync, mkdirSync } from "fs";
import { toHomeRelativePath } from "./toHomeRelativePath";

export function ensureDir(dir: string) {
  if (existsSync(dir)) return true;

  try {
    mkdirSync(dir, { recursive: true });
    showToast({
      title: `Folder ${toHomeRelativePath(dir)} is created`,
      style: Toast.Style.Success,
    });
    return true;
  } catch (error) {
    showToast({
      title: `Failed to create to folder ${toHomeRelativePath(dir)}`,
      message: error as string,
      style: Toast.Style.Failure,
    });
    return false;
  }
}
