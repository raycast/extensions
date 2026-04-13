import { closeMainWindow, showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { apiGet, apiPost, TypeWhisperError } from "./api";
import {
  clearActiveDictationSessionId,
  setActiveDictationSessionId,
  setLastDictationSessionId,
} from "./dictation-session";
import type {
  DictationStartResponse,
  DictationStatusResponse,
  DictationStopResponse,
} from "./types";

export default async function Command() {
  try {
    const status = await apiGet<DictationStatusResponse>(
      "/v1/dictation/status",
    );

    if (status.is_recording) {
      const response =
        await apiPost<DictationStopResponse>("/v1/dictation/stop");
      await setLastDictationSessionId(response.id);
      await clearActiveDictationSessionId();
      await closeMainWindow();
      await showHUD("Dictation stopped");
    } else {
      await closeMainWindow();
      const response = await apiPost<DictationStartResponse>(
        "/v1/dictation/start",
      );
      await setActiveDictationSessionId(response.id);
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
