import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { getSelectedRingSound, type RingSound } from "./sounds";

const execFileAsync = promisify(execFile);

function powershellPath(path: string): string {
  return path.replace(/'/g, "''");
}

export async function playSound(sound: RingSound): Promise<void> {
  if (process.platform === "darwin") {
    await execFileAsync("afplay", [sound.path]);
    return;
  }

  if (process.platform === "win32") {
    await execFileAsync("powershell.exe", [
      "-NoProfile",
      "-NonInteractive",
      "-Command",
      `(New-Object System.Media.SoundPlayer '${powershellPath(sound.path)}').PlaySync()`,
    ]);
  }
}

export async function ring(): Promise<void> {
  const sound = await getSelectedRingSound();
  if (!sound) {
    return;
  }
  await playSound(sound);
}
