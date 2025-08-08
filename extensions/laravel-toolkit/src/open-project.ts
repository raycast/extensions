import { showToast, Toast, getPreferenceValues } from "@raycast/api";
import { spawn } from "child_process";
import { getActiveProject } from "../lib/projectStore";

interface Preferences {
  editorPath?: string;
}

export default async function Command() {
  const projectPath = await getActiveProject();
  if (!projectPath) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No Active Project",
      message: "Please set an active project first",
    });
    return;
  }

  const { editorPath } = getPreferenceValues<Preferences>();
  if (!editorPath || !editorPath.trim()) {
    await showToast({
      style: Toast.Style.Failure,
      title: "Editor Path Not Set",
      message: "Configure your editor path in preferences",
    });
    return;
  }

  try {
    await new Promise<void>((resolve, reject) => {
      const platform = process.platform;
      const args: string[] = [];
      let command = "";

      if (platform === "darwin") {
        command = "open";
        args.push("-a", editorPath, projectPath);
      } else if (platform === "win32") {
        command = "cmd";
        args.push("/c", "start", "", `"${editorPath}"`, projectPath);
      } else {
        command = editorPath;
        args.push(projectPath);
      }

      const proc = spawn(command, args, { shell: platform === "win32" });

      proc.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });

      proc.on("error", reject);
    });

    await showToast({
      style: Toast.Style.Success,
      title: "Opened Project",
      message: projectPath,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to Open Project",
      message,
    });
  }
}
