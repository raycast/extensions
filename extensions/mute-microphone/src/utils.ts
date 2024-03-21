import { Cache, LocalStorage, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";

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

  await set(Number(newLevel));

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

export async function get() {
  const result = await runAppleScript(`
      set result to (input volume of (get volume settings))
      return result
    `);
  return result.trim();
}

export async function set(option: number) {
  if (option == 0) {
    const result = await runAppleScript(`set volume input volume 0`);
  } else {
    const result = await runAppleScript(`set volume input volume 100`);
  }
}
