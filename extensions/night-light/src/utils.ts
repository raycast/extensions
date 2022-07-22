import { spawnSync } from "child_process";
import { showToast, Toast } from "@raycast/api";

export async function nightlight(args: Array<string>): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running...",
  });

  const command = spawnSync("nightlight", args, {
    encoding: "utf-8",
    env: {
      PATH: "/bin:/usr/bin:/usr/local/bin:/opt/homebrew/bin",
    },
    maxBuffer: 10 * 1024 * 1024, // 10 MB
    shell: true,
  });

  if (command.status !== 0) {
    toast.style = Toast.Style.Failure;
    toast.title = "Failed";
    toast.message = command.stderr.includes("nightlight: command not found")
      ? "Please install nightlight via homebrew."
      : command.stderr;
  } else {
    toast.style = Toast.Style.Success;
    toast.title = "Done";
  }
}
