import { getPreferenceValues } from "@raycast/api";
import { DEFAULT_SERVER_URL, parseServerUrl } from "./server-url";
import { Preferences } from "./types";

export { parseServerUrl } from "./server-url";
export type SpeechResult = {
  audio: Buffer;
  format: string;
  engine?: string;
};

const HEALTH_TIMEOUT_MS = 2000;

let positiveGatewayCache: { baseUrl: string } | null = null;

export function getConfigError(preferences: Preferences): string | null {
  const serverUrl = preferences.serverUrl?.trim();
  if (serverUrl) {
    try {
      parseServerUrl(serverUrl);
    } catch {
      return "Invalid TTS server URL";
    }
  }
  return null;
}

export async function createSpeech(text: string): Promise<SpeechResult> {
  const preferences = getPreferenceValues<Preferences>();
  const configError = getConfigError(preferences);
  if (configError) {
    throw new Error(configError);
  }

  const { baseUrl, hasCustomPath, fullUrl } = parseServerUrl(preferences.serverUrl ?? DEFAULT_SERVER_URL);
  const isGateway = hasCustomPath ? false : await detectGateway(baseUrl);
  const speechUrl = hasCustomPath ? fullUrl : isGateway ? `${baseUrl}/v1/speech` : `${baseUrl}/tts`;
  const voice = preferences.voice?.trim();

  const formData = new FormData();
  formData.append("text", text);
  if (voice) {
    formData.append("voice", voice);
  }

  const response = await fetch(speechUrl, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(isGateway ? gatewayErrorMessage(response.status) : await genericErrorMessage(response));
  }

  const contentType = response.headers.get("content-type") || "audio/wav";
  const format = parseAudioFormat(contentType);
  const engine = response.headers.get("x-tts-primary-engine") || undefined;
  const audioBuffer = await response.arrayBuffer();
  return { audio: Buffer.from(audioBuffer), format, engine };
}

export async function detectGateway(baseUrl: string): Promise<boolean> {
  if (positiveGatewayCache?.baseUrl === baseUrl) {
    return true;
  }

  let isGateway = false;
  try {
    const response = await fetch(`${baseUrl}/health`, {
      signal: AbortSignal.timeout(HEALTH_TIMEOUT_MS),
    });
    if (response.ok) {
      const body = (await response.json()) as { ok?: boolean; primaryEngine?: string };
      isGateway = body?.ok === true && typeof body?.primaryEngine === "string";
    }
  } catch {
    // Health probe failed — not a gateway or server unreachable
  }

  if (isGateway) {
    positiveGatewayCache = { baseUrl };
  }
  return isGateway;
}

export function gatewayErrorMessage(status: number): string {
  switch (status) {
    case 422:
      return "Text was empty";
    case 502:
      return "TTS engine error";
    case 503:
      return "No TTS engines available — check server configuration";
    case 504:
      return "Speech generation timed out — try shorter text";
    default:
      return `TTS server error (${status})`;
  }
}

export function resetGatewayCacheForTests(): void {
  positiveGatewayCache = null;
}

async function genericErrorMessage(response: Response): Promise<string> {
  const message = await readErrorBody(response);
  const details = message ? `: ${message}` : "";
  return `TTS server error (${response.status})${details}`;
}

function parseAudioFormat(contentType: string): string {
  const mime = contentType.split(";")[0].trim().toLowerCase();
  if (mime === "audio/mpeg" || mime === "audio/mp3") return "mp3";
  if (mime === "audio/wav" || mime === "audio/wave" || mime === "audio/x-wav") return "wav";
  if (mime === "audio/flac") return "flac";
  if (mime === "audio/mp4" || mime === "audio/x-m4a" || mime === "audio/m4a") return "m4a";
  return "wav";
}

async function readErrorBody(response: { text: () => Promise<string> }): Promise<string | null> {
  try {
    const text = await response.text();
    return text.trim() || null;
  } catch {
    return null;
  }
}
