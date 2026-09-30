import { requestWithTimeout } from "./shared-http";
import { TTSApiError, isTTSApiError } from "./tts-api-error";

export const TTS_REQUEST_TIMEOUT_MS = 90_000;

export function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) {
    throw new TTSApiError("TTS synthesis cancelled", -7);
  }
}

export function prepareTTSInput(text: string, signal?: AbortSignal): string {
  const trimmedText = text.trim();
  if (!trimmedText) {
    throw new Error("Text cannot be empty");
  }
  assertNotAborted(signal);
  return trimmedText;
}

export function requirePreference(
  prefs: Record<string, string | undefined>,
  key: string,
  missingMessage: string,
): string {
  const value = prefs[key]?.trim();
  if (!value) {
    throw new TTSApiError(missingMessage, -1);
  }
  return value;
}

export function requestTTSWithTimeout<T>(
  signal: AbortSignal | undefined,
  request: (signal: AbortSignal) => Promise<T>,
) {
  return requestWithTimeout(
    {
      isKnownError: isTTSApiError,
      mapAbort: () => new TTSApiError("TTS synthesis cancelled", -7),
      mapTimeout: (seconds) => new TTSApiError(`Request timeout after ${seconds} seconds`, -2),
      mapUnknown: (error) => new TTSApiError(error instanceof Error ? error.message : String(error), -6),
      signal,
      timeoutMs: TTS_REQUEST_TIMEOUT_MS,
    },
    request,
  );
}

export async function readNonEmptyAudioBase64(
  response: Response,
  emptyMessage: string,
  failureMessage: string,
): Promise<string> {
  if (!response.ok) {
    throw new TTSApiError(`${failureMessage}: HTTP ${response.status} ${response.statusText}`, response.status);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.length === 0) {
    throw new TTSApiError(emptyMessage, -4);
  }
  return buffer.toString("base64");
}
