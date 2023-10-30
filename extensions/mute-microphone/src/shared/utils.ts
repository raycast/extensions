import { Cache, LocalStorage, showToast, Toast } from "@raycast/api";
import { execFileSync } from "child_process";
import { scriptPath } from "./constants";

export async function toggleSystemAudioInputLevel(currentAudioInputLevel: number) {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running...",
  });

  const cache = new Cache();

  if (currentAudioInputLevel > 0 && currentAudioInputLevel <= 1) {
    await LocalStorage.setItem("audio-input-volume", currentAudioInputLevel);
  }

  const savedNonZeroAudioVolume = await LocalStorage.getItem("audio-input-volume");
  const nonZeroAudioVolume = savedNonZeroAudioVolume === undefined ? 1 : savedNonZeroAudioVolume;
  const newLevel = currentAudioInputLevel == 0 ? nonZeroAudioVolume : 0;

  execFileSync(scriptPath, ["set", newLevel.toString()]);

  if (newLevel == 0) {
    toast.title = "Audio input muted";
    toast.style = Toast.Style.Failure;
  } else {
    toast.title = "Audio input unmuted";
    toast.style = Toast.Style.Success;
  }

  cache.set("currentAudioInputLevel", String(newLevel));
  return newLevel;
}

export function getCurrentAudioInputLevel() {
  const result = execFileSync(scriptPath, ["get"]);
  return Number(result.toString());
}
