import { Cache, LocalStorage, showHUD } from "@raycast/api";
import { execFileSync } from "child_process";
import { scriptPath } from "./constants";

export async function toggleSystemAudioInputLevel(currentAudioInputLevel: number) {
  const cache = new Cache();

  if (currentAudioInputLevel > 0 && currentAudioInputLevel <= 1) {
    await LocalStorage.setItem("audio-input-volume", currentAudioInputLevel);
  }

  const savedNonZeroAudioVolume = await LocalStorage.getItem("audio-input-volume");
  const nonZeroAudioVolume = savedNonZeroAudioVolume === undefined ? 1 : savedNonZeroAudioVolume;
  const newLevel = currentAudioInputLevel == 0 ? nonZeroAudioVolume : 0;

  execFileSync(scriptPath, ["set", newLevel.toString()]);

  const message = newLevel == 0 ? "Audio input muted" : "Audio input unmuted";
  await showHUD(message);
  cache.set("currentAudioInputLevel", String(newLevel));
  return newLevel;
}

export function getCurrentAudioInputLevel() {
  const result = execFileSync(scriptPath, ["get"]);
  return Number(result.toString());
}
