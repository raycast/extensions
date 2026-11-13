import { getPreferenceValues, showToast } from "@raycast/api";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { setTimeout } from "node:timers/promises";

export const preferences = getPreferenceValues<Preferences>();

export const isWin = process.platform === "win32";

export const execp = promisify(execFile);

export function getCliPath(): string {
  const cliPath = preferences.cliPath;

  if (cliPath) return cliPath;

  return isWin
    ? "C:\\Program Files\\Flameshot\\bin\\flameshot-cli.exe"
    : "/Applications/Flameshot.app/Contents/MacOS/flameshot";
}

export async function countdown(milliseconds: number, showCountdown = true): Promise<void> {
  if (!milliseconds) return;

  if (!showCountdown) {
    await setTimeout(milliseconds);
    return;
  }

  const formatSeconds = (value: number) => (value / 1000).toFixed(3).replace(/\.?0+$/, "");

  let remaining = Math.max(0, milliseconds);

  const toast = await showToast({
    title: formatSeconds(remaining),
  });

  while (remaining > 0) {
    const waitTime = remaining % 1000 || 1000;

    await setTimeout(waitTime);
    remaining -= waitTime;

    if (remaining > 0) {
      toast.title = formatSeconds(remaining);
    }
  }

  toast.hide();
}
