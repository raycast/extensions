import { Cache, LocalStorage, showHUD } from "@raycast/api";
import { runAppleScript } from "@raycast/utils";

export async function toggleSystemAudioInputLevel(currentAudioInputLevel: number) {
  const cache = new Cache();
  if (currentAudioInputLevel > 0 && currentAudioInputLevel <= 100) {
    await LocalStorage.setItem("audio-input-volume", currentAudioInputLevel);
  }
  const savedNonZeroAudioVolume = await LocalStorage.getItem("audio-input-volume");
  const nonZeroAudioVolume = savedNonZeroAudioVolume === undefined ? 100 : savedNonZeroAudioVolume;
  const newLevel = currentAudioInputLevel == 0 ? nonZeroAudioVolume : 0;
  await runAppleScript(`set volume input volume ${String(newLevel)}`);
  await showHUD(`Setting input volume (microphone) to ${newLevel}`);
  cache.set("currentAudioInputLevel", String(newLevel));
  return newLevel;
}
