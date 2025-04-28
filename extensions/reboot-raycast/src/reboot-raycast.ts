import { closeMainWindow, showToast, Toast } from "@raycast/api";
import { spawn } from "child_process";

export default async function main() {
  await closeMainWindow();
  await showToast({ style: Toast.Style.Animated, title: "Restarting Raycast..." });

  // Use spawn to create a detached child process that survives Raycast quitting
  const subprocess = spawn(
    "/bin/bash",
    [
      "-c",
      `
    sleep .5;
    open -a "Raycast"
  `,
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  subprocess.unref(); // Detach from Raycast

  // Now kill Raycast (including this extension)
  spawn("killall", ["Raycast"]);
}
