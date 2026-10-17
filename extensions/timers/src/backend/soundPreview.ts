import { environment } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { join } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { play_preview, stop_preview } from "rust:../../rust";
import { alertVolume } from "./windowsBackend";

export interface SoundPreview {
  done: Promise<void>;
  stop: () => Promise<void>;
}

export function startSoundPreview(sound: string, volume: string): SoundPreview {
  const level = alertVolume(volume);
  const path = join(environment.assetsPath, sound);
  if (process.platform === "win32") {
    const token = randomUUID();
    let settled = false;
    let stopped = false;
    const done = play_preview(path, sound === "speak_timer_name", level, token).finally(() => {
      settled = true;
    });
    // Stop can arrive while the bridge is still starting. Retry until the player owns its event.
    return {
      done,
      stop: async () => {
        const deadline = Date.now() + 10000;
        while (!settled && !stopped) {
          stopped = await stop_preview(token);
          if (!stopped && !settled) {
            if (Date.now() >= deadline) throw new Error("Sound preview did not acknowledge Stop");
            await delay(50);
          }
        }
        await done;
      },
    };
  }
  let stopped = false;
  const child =
    sound === "speak_timer_name"
      ? spawn("say", ["Untitled Timer"])
      : spawn("afplay", [path, "--volume", String(level)]);
  let stderr = "";
  child.stderr.on("data", (data) => {
    stderr += data;
  });
  const done = new Promise<void>((resolve, reject) => {
    child.once("error", reject);
    child.once("close", (code) => {
      if (stopped || code === 0) resolve();
      else reject(new Error(stderr || `Sound preview exited with code ${code}`));
    });
  });
  return {
    done,
    stop: async () => {
      stopped = true;
      if (child.exitCode === null && child.signalCode === null) child.kill();
      await done;
    },
  };
}
