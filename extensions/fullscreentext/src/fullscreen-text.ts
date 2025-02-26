import { execFile } from "child_process";
import { promisify } from "util";
import { environment, showToast, Toast, closeMainWindow } from "@raycast/api";
import { join } from "path";
import { chmodSync } from "fs";

const execFileAsync = promisify(execFile);

export default async function Command(props: { arguments: { text: string } }) {
  const text = props.arguments.text;
  const swiftScriptPath = join(environment.assetsPath, "fullscreen_text.swift");
  chmodSync(swiftScriptPath, 0o755);

  closeMainWindow({ clearRootSearch: true });

  try {
    showToast({ style: Toast.Style.Success, title: "Text displayed" });
    await execFileAsync(swiftScriptPath, [text]);
  } catch (error) {
    console.error("Execution error:", error);
    await showToast({ style: Toast.Style.Failure, title: "Error executing script", message: String(error) });
  }
}
