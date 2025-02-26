import { execFile } from "child_process";
import { promisify } from "util";
import { showToast, Toast, closeMainWindow } from "@raycast/api";
import path from "path";

const execFileAsync = promisify(execFile);

export default async function Command(props: { arguments: { text: string } }) {
  const text = props.arguments.text;
  const swiftScriptPath = path.join(__dirname, "assets", "fullscreen_text.swift");

  closeMainWindow({ clearRootSearch: true });

  try {
    showToast({ style: Toast.Style.Success, title: "Text displayed" });
    await execFileAsync(swiftScriptPath, [text]);
  } catch (error) {
    console.error("Execution error:", error);
    await showToast({ style: Toast.Style.Failure, title: "Error executing script", message: String(error) });
  }
}
