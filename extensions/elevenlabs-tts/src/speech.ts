import { getPreferenceValues, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { execFile } from "child_process";
import { promisify } from "util";
import { AudioManager } from "./audio/AudioManager";
import { getTextPreview, getTextStats } from "./text/processing";
import { prepareVoiceSettings } from "./voice/settings";

const execFileAsync = promisify(execFile);

async function stopExistingPlayback(): Promise<boolean> {
  let stdout: string;
  try {
    ({ stdout } = await execFileAsync("pgrep", ["afplay"]));
  } catch {
    return false;
  }

  if (!stdout.trim()) return false;

  await execFileAsync("pkill", ["afplay"]);
  await showToast({
    style: Toast.Style.Success,
    title: "⏹️ Stopped",
  });
  return true;
}

export async function speakText(getText: () => Promise<string>): Promise<void> {
  try {
    if (await stopExistingPlayback()) return;

    await showToast({
      style: Toast.Style.Animated,
      title: "Reading...",
    });

    const text = await getText();
    const { wordCount } = getTextStats(text);
    const previewText = getTextPreview(text, 40);
    const preferences = getPreferenceValues<Preferences>();
    const settings = prepareVoiceSettings(preferences);

    const audioManager = new AudioManager({
      text,
      voiceId: preferences.voiceId,
      apiKey: preferences.elevenLabsApiKey,
      settings,
      playbackSpeed: preferences.playbackSpeed,
    });

    await showToast({
      style: Toast.Style.Success,
      title: `🎙️ ${wordCount} words`,
      message: `"${previewText}"`,
    });

    await audioManager.streamAndPlay();
  } catch (error) {
    console.error("Command error:", error);
    await showFailureToast(error, {
      title: "Failed to play audio",
    });
  }
}
