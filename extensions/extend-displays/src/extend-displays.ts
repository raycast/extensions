import { closeMainWindow, showHUD, showToast, Toast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const displaySwitchPath = `${process.env.SystemRoot ?? "C:\\Windows"}\\System32\\DisplaySwitch.exe`;

export default async function command() {
  await closeMainWindow();

  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Extending displays...",
  });

  try {
    await execFileAsync(displaySwitchPath, ["/extend"], { windowsHide: true });

    toast.style = Toast.Style.Success;
    toast.title = "Displays extended";

    await showHUD("Displays set to Extend");
  } catch (error) {
    toast.style = Toast.Style.Failure;
    toast.title = "Couldn't extend displays";
    toast.message = error instanceof Error ? error.message : String(error);

    throw error;
  }
}
