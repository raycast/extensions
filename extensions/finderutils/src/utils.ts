import { spawnSync } from "node:child_process";

export async function runAppleScript(script: string) {
  if (process.platform !== "darwin") {
    throw new Error("macOS only");
  }

  const locale = process.env.LC_ALL;
  delete process.env.LC_ALL;
  const { stdout } = spawnSync("osascript", ["-e", script]);
  process.env.LC_ALL = locale;
  return stdout.toString();
}
