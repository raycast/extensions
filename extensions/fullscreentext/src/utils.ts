import { join } from "path";
import { chmodSync } from "fs";
import { promisify } from "util";
import { execFile } from "child_process";
import { environment, closeMainWindow } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";

export async function fullScreen(text: string) {
  const execFileAsync = promisify(execFile);

  const swiftScriptPath = join(environment.assetsPath, "fullscreen.swift");
  chmodSync(swiftScriptPath, 0o755);

  closeMainWindow({ clearRootSearch: true });

  try {
    await execFileAsync(swiftScriptPath, [text]);
  } catch (error) {
    console.error("Execution error:", error);
    await showFailureToast(error, { title: "Error executing script", message: String(error) });
  }
}
