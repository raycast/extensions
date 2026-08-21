import { getPreferenceValues } from "@raycast/api";
import { chatCompletion, ChatMessage, HermesConfig } from "./hermes-client";

export function getPreferences() {
  return getPreferenceValues<Preferences>();
}

export function getConfig(): HermesConfig {
  const prefs = getPreferences();
  return {
    endpoint: prefs.endpoint,
    token: prefs.token,
    modelName: prefs.modelName,
    profile: prefs.profile || undefined,
  };
}

/**
 * One-shot question with optional streaming. Returns the answer plus the
 * server-side session id (X-Hermes-Session-Id) so callers can offer
 * "continue in chat".
 */
export async function askQuestion(
  question: string,
  onStream?: (chunk: string) => void,
): Promise<{ content: string; sessionId: string | null }> {
  return chatCompletion(getConfig(), [{ role: "user", content: question }], {
    onDelta: onStream,
  });
}

/**
 * Back-compat shim for the pre-session message API.
 */
export async function sendMessage(
  messages: ChatMessage[],
  onStream?: (chunk: string) => void,
): Promise<string> {
  const result = await chatCompletion(getConfig(), messages, {
    onDelta: onStream,
  });
  return result.content;
}
