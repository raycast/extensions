import { closeMainWindow, showHUD } from "@raycast/api";
import {
  apiGet,
  apiPost,
  DICTATION_START_TIMEOUT_MS,
  TypeWhisperError,
} from "./api";
import { setLastDictationSessionId } from "./dictation-session";
import type {
  DictationStartResponse,
  DictationStatusResponse,
  DictationStopResponse,
} from "./types";

export async function startDictationWithWorkflow(workflow: {
  id: string;
  name: string;
}): Promise<void> {
  const status = await apiGet<DictationStatusResponse>("/v1/dictation/status");
  if (status.is_recording) {
    throw new TypeWhisperError(
      "A dictation is already running. Stop it first.",
    );
  }

  // Close Raycast first so the dictation goes into the app you came from.
  await closeMainWindow();
  const response = await apiPost<DictationStartResponse>(
    "/v1/dictation/start",
    { workflow_id: workflow.id },
    { timeoutMs: DICTATION_START_TIMEOUT_MS },
  );
  // Track the session even if it is stopped outside Raycast.
  await setLastDictationSessionId(response.id);
  await showHUD(`Dictation started with "${workflow.name}"`);
}

export async function stopDictation(): Promise<void> {
  // TypeWhisper inserts the text into the frontmost app, so hand focus back
  // before stopping.
  await closeMainWindow();
  const response = await apiPost<DictationStopResponse>("/v1/dictation/stop");
  await setLastDictationSessionId(response.id);
  await showHUD("Dictation stopped");
}
