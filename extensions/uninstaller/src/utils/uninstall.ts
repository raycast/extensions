import { Application, showToast, Toast } from "@raycast/api";
import { execSync } from "child_process";
import { removeWithAdmin } from "./admin-removal";
import { escapeShellPath, fileExists, log } from "./helpers";

export async function uninstallApplication(app: Application, files: string[], reloadApps: () => Promise<void>) {
  await showToast({
    style: Toast.Style.Animated,
    title: `Uninstalling ${app.name}`,
    message: `Removing ${files.length} files...`,
  });

  try {
    for (const file of files) {
      execSync(`rm -rf ${escapeShellPath(file)}`);
    }
  } catch (error) {
    log("Regular removal failed, trying admin:", error);
    await removeWithAdmin(files);
  }

  if (fileExists(app.path)) {
    throw new Error("Application was not removed successfully");
  }

  await showToast({
    style: Toast.Style.Success,
    title: `Successfully uninstalled ${app.name}`,
    message: `Removed ${files.length} files`,
  });

  await reloadApps();
}
