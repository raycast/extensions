import { environment } from "@raycast/api";
import { execFile } from "node:child_process";
import { join } from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

export type Sound = "toggle" | "done";

function soundPath(sound: Sound): string {
  return join(environment.assetsPath, "sounds", `${sound}.wav`);
}

/** Plays a bundled WAV. Resolves when playback ends; never throws. */
export async function playSound(sound: Sound): Promise<void> {
  const file = soundPath(sound);
  try {
    if (process.platform === "darwin") {
      await run("afplay", [file]);
    } else if (process.platform === "win32") {
      await run(
        "powershell.exe",
        [
          "-NoProfile",
          "-NonInteractive",
          "-WindowStyle",
          "Hidden",
          "-Command",
          "(New-Object System.Media.SoundPlayer $env:POMO_SOUND).PlaySync()",
        ],
        { env: { ...process.env, POMO_SOUND: file }, windowsHide: true },
      );
    }
  } catch (error) {
    console.error(`Could not play ${sound} sound`, error);
  }
}
