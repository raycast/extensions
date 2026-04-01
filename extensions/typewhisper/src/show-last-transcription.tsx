import { Clipboard, closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { apiGet, TypeWhisperError } from "./api";
import type { HistoryResponse } from "./types";

export default async function Command() {
  try {
    const response = await apiGet<HistoryResponse>("/v1/history", {
      limit: "1",
    });

    if (response.entries.length === 0) {
      await showHUD("No transcriptions yet");
      return;
    }

    const entry = response.entries[0];
    await Clipboard.copy(entry.text);
    await closeMainWindow();

    const preview =
      entry.text.length > 60 ? entry.text.substring(0, 60) + "..." : entry.text;
    await showHUD(`Copied: ${preview}`);
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
