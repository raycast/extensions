import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { apiGet, apiPost, TypeWhisperError } from "./api";
import type { DictationStatusResponse } from "./types";

export default async function Command() {
  try {
    const status = await apiGet<DictationStatusResponse>(
      "/v1/dictation/status",
    );

    if (status.is_recording) {
      await apiPost("/v1/dictation/stop");
      await closeMainWindow();
      await showHUD("Dictation stopped");
    } else {
      await closeMainWindow();
      await apiPost("/v1/dictation/start");
      await showHUD("Dictation started");
    }
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
