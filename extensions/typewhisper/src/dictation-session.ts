import { LocalStorage } from "@raycast/api";
import { TypeWhisperError, apiGet } from "./api";
import type { DictationTranscriptionResponse } from "./types";

const LAST_DICTATION_SESSION_ID_KEY = "last-dictation-session-id";

export async function setLastDictationSessionId(id: string): Promise<void> {
  await LocalStorage.setItem(LAST_DICTATION_SESSION_ID_KEY, id);
}

export async function getLastDictationSessionId(): Promise<string | undefined> {
  const id = await LocalStorage.getItem<string>(LAST_DICTATION_SESSION_ID_KEY);
  return id ?? undefined;
}

export async function fetchLastKnownDictationTranscription(): Promise<DictationTranscriptionResponse | null> {
  const id = await getLastDictationSessionId();
  if (!id) {
    return null;
  }

  try {
    return await apiGet<DictationTranscriptionResponse>(
      "/v1/dictation/transcription",
      { id },
    );
  } catch (error) {
    if (error instanceof TypeWhisperError && error.statusCode === 404) {
      return null;
    }
    throw error;
  }
}
