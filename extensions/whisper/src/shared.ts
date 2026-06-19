import { getPreferenceValues } from "@raycast/api";

const DEFAULT_WHISPER_URL = "https://whisper.quentinvedrenne.com";
const MAX_DURATION_SECONDS = 7 * 86400; // 7 days

function getWhisperUrl(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  return serverUrl?.trim() || DEFAULT_WHISPER_URL;
}

export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length < 2) return null;

  const suffix = trimmed.at(-1);
  const numStr = trimmed.slice(0, -1);
  const value = parseInt(numStr, 10);

  if (Number.isNaN(value) || value <= 0) return null;

  let seconds: number;
  switch (suffix) {
    case "m":
      seconds = value * 60;
      break;
    case "h":
      seconds = value * 3600;
      break;
    case "d":
      seconds = value * 86400;
      break;
    default:
      return null;
  }

  if (seconds > MAX_DURATION_SECONDS) return null;

  return seconds;
}

export function formatDuration(seconds: number): string {
  if (seconds >= 86400 && seconds % 86400 === 0) {
    return `${seconds / 86400} day(s)`;
  } else if (seconds >= 3600 && seconds % 3600 === 0) {
    return `${seconds / 3600} hour(s)`;
  }
  return `${seconds / 60} minute(s)`;
}

export async function createSecret(
  secret: string,
  expirationTimestamp: number,
  selfDestruct: boolean,
): Promise<string> {
  const formData = new URLSearchParams();
  formData.set("secret", secret);
  formData.set("expiration", expirationTimestamp.toString());
  if (selfDestruct) {
    formData.set("self_destruct", "true");
  }

  let response: Response;
  try {
    response = await fetch(`${getWhisperUrl()}/secret?source=raycast`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: formData.toString(),
      redirect: "manual",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Could not reach Whisper server: ${message}`);
  }

  const location = response.headers.get("location");
  if (!location) {
    const body = await response.text();
    const detail = body.trim().slice(0, 100);
    throw new Error(
      response.ok
        ? `Unexpected response from Whisper server (${response.status}). ${detail ? detail : "No details."}`
        : `Whisper server error (${response.status}). ${detail ? detail : "Please try again later."}`,
    );
  }

  const url = new URL(location, getWhisperUrl());
  const secretId = url.searchParams.get("shared_secret_id");
  if (!secretId) {
    throw new Error(`Could not extract secret ID from redirect: ${location}`);
  }

  return `${getWhisperUrl()}/get_secret?shared_secret_id=${secretId}`;
}
