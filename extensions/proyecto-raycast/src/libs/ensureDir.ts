import { showToast, Toast } from "@raycast/api";
import { existsSync, mkdirSync } from "fs";
import { toHomeRelativePath } from "./toHomeRelativePath";
import { showFailureToast } from "@raycast/utils";

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
    showFailureToast(error, {
      title: `Failed to create folder ${toHomeRelativePath(dir)}`,
    });
    return false;
  }
}
