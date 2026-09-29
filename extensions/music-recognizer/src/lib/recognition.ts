import { getPreferenceValues } from "@raycast/api";
import { recognizeWithAudd } from "./providers/audd";
import type { RecognizedTrack } from "./types";

export interface RecognitionProvider {
  /** Display name, used in user-facing messages. */
  name: string;
  /** Resolves to null when the provider has no match for the recording. */
  recognize(wavPath: string, apiToken: string, signal?: AbortSignal): Promise<RecognizedTrack | null>;
}

/**
 * The extension talks to one recognition provider, behind this interface so a
 * second one can be added without touching the commands or the UI.
 */
export const provider: RecognitionProvider = {
  name: "AudD",
  recognize: recognizeWithAudd,
};

/** Recognizes the recording written by the loopback recorder. */
export async function recognizeWavFile(wavPath: string, signal?: AbortSignal): Promise<RecognizedTrack | null> {
  const { apiToken } = getPreferenceValues<Preferences>();
  const token = apiToken?.trim();
  if (!token) {
    throw new Error(`Add your ${provider.name} API token in the extension preferences to identify songs.`);
  }
  return provider.recognize(wavPath, token, signal);
}
