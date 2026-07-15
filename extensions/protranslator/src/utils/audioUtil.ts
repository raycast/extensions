import { exec } from "child_process";
import { showToast, Toast } from "@raycast/api";

export async function playAudio(text: string) {
  try {
    // Basic sanitization to prevent shell injection, though 'say' is relatively safe with quoted strings.
    // Replacing double quotes with single quotes.
    const sanitizedText = text.replace(/"/g, "'");

    exec(`say "${sanitizedText}"`, (error) => {
      if (error) {
        console.error("Audio playback failed", error);
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to play audio",
        });
      }
    });
  } catch (error) {
    console.error("Audio playback error", error);
    await showToast({
      style: Toast.Style.Failure,
      title: "Failed to play audio",
    });
  }
}
