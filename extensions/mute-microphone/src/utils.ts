import { showHUD, showToast, Toast } from "@raycast/api";
import { runAppleScript } from "run-applescript";
import { AudioInputLevelCache } from "./audio-input-level-cache";

async function getAudioInputLevel() {
  const result = await runAppleScript(`
      set result to (input volume of (get volume settings))
      return result
    `);
  return result.trim();
}

export async function setAudioInputLevel(v: string) {
  await runAppleScript(`set volume input volume ${v}`);
  AudioInputLevelCache.curInputLevel = v;
}

const toggleSystemAudioInputLevelWithPreviousLevel = async (): Promise<string> => {
  const currentLevel = await getAudioInputLevel();

  if (currentLevel === "0") {
    // unmute
    const prevInputLevel = AudioInputLevelCache.prevInputLevel;
    await setAudioInputLevel(prevInputLevel);
    AudioInputLevelCache.curInputLevel = prevInputLevel;
    return prevInputLevel;
  }

  // mute
  await setAudioInputLevel("0");
  AudioInputLevelCache.prevInputLevel = currentLevel;
  AudioInputLevelCache.curInputLevel = "0";
  return "0";
};

export const toggleSystemAudioInputLevel = async () => {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: "Running...",
  });

  const inputLevel = await toggleSystemAudioInputLevelWithPreviousLevel();

  if (inputLevel === "0") {
    toast.title = "Audio input muted";
    toast.style = Toast.Style.Failure;
  } else {
    toast.title = "Audio input unmuted";
    toast.style = Toast.Style.Success;
  }

  return inputLevel;
};
