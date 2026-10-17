import { environment, getApplications } from "@raycast/api";
import { join } from "node:path";
import { ensure_timer_worker, notification_app_id, preview_sound } from "rust:../../rust";
import { Preferences } from "./types";

export interface WindowsWorkerConfig {
  timerFile: string;
  workerId: string;
  deadline: number;
  soundPath: string;
  speak: boolean;
  volume: number;
  ringContinuously: boolean;
  notificationAppId: string;
}

let appIdPromise: Promise<string> | undefined;
async function notificationAppId() {
  appIdPromise ??= notification_app_id().catch(async () => {
    const apps = await getApplications();
    const appId = apps.find((app) => app.name === "Raycast")?.windowsAppId;
    if (!appId) throw new Error("Raycast's Windows notification identity is unavailable");
    return appId;
  });
  // A failed lookup must be retried on the next start.
  appIdPromise.catch(() => (appIdPromise = undefined));
  return appIdPromise;
}

export function alertVolume(value: string) {
  const volume = Number(value.replace(",", "."));
  if (!value.trim() || !Number.isFinite(volume) || volume < 0 || volume > (process.platform === "win32" ? 1 : 5)) {
    throw new Error(`Alert volume must be between 0 and ${process.platform === "win32" ? 1 : 5}`);
  }
  return volume;
}

export async function windowsWorkerConfig(
  timerFile: string,
  workerId: string,
  seconds: number,
  sound: string,
  prefs: Preferences,
): Promise<WindowsWorkerConfig> {
  const appId = await notificationAppId();
  return {
    timerFile,
    workerId,
    deadline: Date.now() + Math.ceil(seconds * 1000),
    soundPath: join(environment.assetsPath, sound),
    speak: sound === "speak_timer_name",
    volume: alertVolume(prefs.volumeSetting),
    ringContinuously: prefs.ringContinuously,
    notificationAppId: appId,
  };
}

export const ensureWindowsWorker = (config: WindowsWorkerConfig) => ensure_timer_worker(JSON.stringify(config));

export async function previewWindowsSound(sound: string, volume: string) {
  await preview_sound(join(environment.assetsPath, sound), sound === "speak_timer_name", alertVolume(volume));
}
