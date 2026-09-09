import { getPreferenceValues } from "@raycast/api";
// Raycast's Node runtime does not expose the WebCrypto global, so import it
// explicitly. Same AES-256-GCM primitives the web app uses.
import { webcrypto } from "node:crypto";

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

function b64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

async function encryptSecret(plaintext: string): Promise<{ keyB64: string; payloadB64: string }> {
  const key = await webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const nonce = webcrypto.getRandomValues(new Uint8Array(12));
  const ciphertext = new Uint8Array(
    await webcrypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, new TextEncoder().encode(plaintext)),
  );
  const rawKey = new Uint8Array(await webcrypto.subtle.exportKey("raw", key));
  const payload = new Uint8Array(12 + ciphertext.length);
  payload.set(nonce);
  payload.set(ciphertext, 12);
  return { keyB64: b64urlEncode(rawKey), payloadB64: b64urlEncode(payload) };
}

/**
 * Creates a zero-knowledge secret: encrypted locally with AES-256-GCM, the key
 * only ever lives in the link's #k= fragment (never sent to any server).
 * Falls back to the legacy server-encrypted endpoint for older self-hosted servers.
 */
export async function createSecret(
  secret: string,
  expirationTimestamp: number,
  selfDestruct: boolean,
): Promise<string> {
  const base = getWhisperUrl();
  const { keyB64, payloadB64 } = await encryptSecret(secret);

  let response: Response;
  try {
    response = await fetch(`${base}/v1/ephemeral?source=raycast`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        payload: payloadB64,
        expiration: expirationTimestamp,
        self_destruct: selfDestruct,
      }),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Could not reach Whisper server: ${message}`);
  }

  if (response.status === 404 || response.status === 405) {
    // Older self-hosted server without the zero-knowledge endpoint.
    return createSecretLegacy(secret, expirationTimestamp, selfDestruct);
  }
  if (response.status !== 201) {
    const body = await response.text();
    const detail = body.trim().slice(0, 100);
    throw new Error(`Whisper server error (${response.status}). ${detail || "Please try again later."}`);
  }

  const { id } = (await response.json()) as { id: string };
  return `${base}/get_secret?shared_secret_id=${id}#k=${keyB64}`;
}

async function createSecretLegacy(secret: string, expirationTimestamp: number, selfDestruct: boolean): Promise<string> {
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
