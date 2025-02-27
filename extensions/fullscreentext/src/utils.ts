import { join } from "path";
import { chmodSync } from "fs";
import { promisify } from "util";
import { execFile } from "child_process";
import { environment, closeMainWindow, showToast, Toast } from "@raycast/api";

export async function fullScreen(text: string) {
  const execFileAsync = promisify(execFile);

  const swiftScriptPath = join(environment.assetsPath, "fullscreen.swift");
  chmodSync(swiftScriptPath, 0o755);

  closeMainWindow({ clearRootSearch: true });

  try {
    await execFileAsync(swiftScriptPath, [text]);
  } catch (error) {
    console.error("Execution error:", error);
    await showToast({ style: Toast.Style.Failure, title: "Error executing script", message: String(error) });
  }
}
