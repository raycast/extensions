import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { apiGet, TypeWhisperError } from "./api";
import { fetchLastKnownDictationTranscription } from "./dictation-session";
import type { HistoryResponse } from "./types";

async function copyAndPreview(text: string) {
  await Clipboard.copy(text);
  await closeMainWindow();

  const preview = text.length > 60 ? text.substring(0, 60) + "..." : text;
  await showHUD(`Copied: ${preview}`);
}

export default async function Command() {
  try {
    const sessionResponse = await fetchLastKnownDictationTranscription();
    if (sessionResponse) {
      if (
        sessionResponse.status === "completed" &&
        sessionResponse.transcription?.text
      ) {
        await copyAndPreview(sessionResponse.transcription.text);
        return;
      }

      if (sessionResponse.status === "processing") {
        await showHUD("Last dictation is still processing");
        return;
      }

      if (sessionResponse.status === "recording") {
        await showHUD("Dictation is still recording");
        return;
      }

      if (sessionResponse.status === "failed") {
        await showFailureToast(
          sessionResponse.error || "The last dictation failed",
          { title: "TypeWhisper" },
        );
        return;
      }
    }

    const response = await apiGet<HistoryResponse>("/v1/history", {
      limit: "1",
    });

    if (response.entries.length === 0) {
      await showHUD("No transcriptions yet");
      return;
    }

    await copyAndPreview(response.entries[0].text);
  } catch (error) {
    if (error instanceof TypeWhisperError) {
      await showFailureToast(error.message, { title: "TypeWhisper" });
    } else {
      await showFailureToast("An unexpected error occurred", {
        title: "TypeWhisper",
      });
    }
  }
}
