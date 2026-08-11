import { closeMainWindow, showHUD } from "@raycast/api";
import { getQoderCLIFilename } from "./lib/qoder";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

export default async function Command() {
  try {
    await closeMainWindow();
    const cliPath = await getQoderCLIFilename();
    await execFileAsync(cliPath, ["--new-window"]);
    await showHUD("Opening new Qoder window...");
  } catch {
    await showHUD("Failed to open Qoder. Please make sure Qoder is installed.");
  }
}
