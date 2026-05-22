import { showHUD, showToast, Toast } from "@raycast/api";
import { speak } from "./kokoro";
import { reportError } from "./report-error";

/**
 * Synthesise and play `text`, managing the progress toast and the final HUD.
 * Shared by every Speak command (per-language and auto-detect).
 */
export async function runSpeak(
  label: string,
  text: string,
  voice: string,
  speed: number,
  pythonPath: string,
): Promise<void> {
  const toast = await showToast({
    style: Toast.Style.Animated,
    title: `Generating ${label} speech...`,
  });

  try {
    await speak(text, voice, speed, pythonPath, () => {
      toast.hide();
      showHUD(`Speaking ${label}...`);
    });
  } catch (error) {
    await toast.hide();
    await reportError(error);
  }
}
