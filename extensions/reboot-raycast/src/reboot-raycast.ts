import { showHUD } from "@raycast/api";
import { spawn } from "child_process";

export default async function Command() {
  await showHUD("Rebooting Raycast...");

  // Add a tiny artificial delay before killing
  await new Promise((resolve) => setTimeout(resolve, 300)); // 300ms delay

  const subprocess = spawn(
    "/bin/bash",
    [
      "-c",
      `
    sleep 0.5;
    open -a "Raycast"
  `,
    ],
    {
      detached: true,
      stdio: "ignore",
    },
  );

  subprocess.unref();

  spawn("killall", ["Raycast"]);
}
