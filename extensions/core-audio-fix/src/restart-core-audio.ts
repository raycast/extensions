import { showHUD, showToast, ToastStyle } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    return "Unknown error";
  }
}

export default async function main() {
  await showToast(ToastStyle.Animated, "Restarting Core Audio...");

  try {
    const script = 'do shell script "killall coreaudiod" with administrator privileges';

    // Wir ignorieren stdout bewusst, um no-unused-vars zu vermeiden
    const result = await execFileAsync("/usr/bin/osascript", ["-e", script]);

    // osascript schreibt gelegentlich nach stderr, selbst wenn's ok ist
    const stderr = result.stderr?.toString().trim();
    if (stderr) {
      await showToast(ToastStyle.Animated, stderr);
    }

    await showHUD("✅ CoreAudio restarted");
  } catch (err: unknown) {
    await showToast(ToastStyle.Failure, "Failed", errorMessage(err));
  }
}
