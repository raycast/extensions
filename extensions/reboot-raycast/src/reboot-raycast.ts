import { showHUD } from "@raycast/api";
import { spawn } from "child_process";

export default async function Command() {
  await showHUD("Rebooting Raycast...");

  await new Promise((resolve) => setTimeout(resolve, 1500)); // 1.5 seconds

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
