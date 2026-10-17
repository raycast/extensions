import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import {
  apiGet,
  apiPost,
  DICTATION_START_TIMEOUT_MS,
  TypeWhisperError,
} from "./api";
import { setLastDictationSessionId } from "./dictation-session";
import { stopDictation } from "./workflow-dictation";
import type { DictationStartResponse, DictationStatusResponse } from "./types";

export default async function Command() {
  try {
    const status = await apiGet<DictationStatusResponse>(
      "/v1/dictation/status",
    );

    if (status.is_recording) {
      await stopDictation();
    } else {
      await closeMainWindow();
      const response = await apiPost<DictationStartResponse>(
        "/v1/dictation/start",
        undefined,
        { timeoutMs: DICTATION_START_TIMEOUT_MS },
      );
      // Track the session even if it is stopped outside Raycast.
      await setLastDictationSessionId(response.id);
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
