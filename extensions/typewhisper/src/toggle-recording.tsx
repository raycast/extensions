import { showHUD } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { apiGet, apiPost, errorMessage } from "./api";
import { setLastRecorderSessionId, stopRecording } from "./recorder-session";
import type { RecorderStartResponse, RecorderStatusResponse } from "./types";

export default async function Command() {
  try {
    const status = await apiGet<RecorderStatusResponse>("/v1/recorder/status");

    if (status.recording) {
      await stopRecording();
      await showHUD(
        "Recording stopped. Open Show Last Recording for the transcript.",
      );
    } else {
      const response =
        await apiPost<RecorderStartResponse>("/v1/recorder/start");
      await setLastRecorderSessionId(response.id);
      await showHUD("Recording started");
    }
  } catch (error) {
    await showFailureToast(errorMessage(error, "Failed to toggle recording"), {
      title: "TypeWhisper",
    });
  }
}
