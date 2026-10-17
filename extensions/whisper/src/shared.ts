import { Clipboard, getPreferenceValues } from "@raycast/api";
// Raycast's Node runtime does not expose the WebCrypto global, so import it
// explicitly. Same AES-256-GCM primitives the web app uses.
import { webcrypto } from "node:crypto";

const DEFAULT_WHISPER_URL = "https://whisper.quentinvedrenne.com";
const MAX_DURATION_SECONDS = 7 * 86400; // 7 days
/** Server-side cap on the stored payload (see Whisper's MAX_SECRET_SIZE). */
export const MAX_SECRET_BYTES = 64 * 1024;
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
/** What AES-GCM adds on top of the plaintext: the nonce we prepend + the auth tag. */
const PAYLOAD_OVERHEAD_BYTES = NONCE_BYTES + TAG_BYTES;
const KEY_BYTES = 32;

export const DURATION_OPTIONS = [
  { value: "30m", title: "30 Minutes" },
  { value: "1h", title: "1 Hour" },
  { value: "24h", title: "24 Hours" },
  { value: "7d", title: "7 Days" },
] as const;

function getWhisperUrl(): string {
  const { serverUrl } = getPreferenceValues<Preferences>();
  // Strip trailing slashes so a preference like "https://host/" does not
  // produce "//v1/ephemeral" (a 404 that would look like an outdated server).
  return serverUrl?.trim().replace(/\/+$/, "") || DEFAULT_WHISPER_URL;
}

/** User-configured defaults, shared by every command and the AI tool. */
export function getDefaults(): { durationSeconds: number; selfDestruct: boolean; duration: string } {
  const prefs = getPreferenceValues<Preferences>();
  const duration = prefs.defaultDuration || "1h";
  return {
    duration,
    durationSeconds: parseDuration(duration) ?? 3600,
    selfDestruct: prefs.defaultSelfDestruct ?? true,
  };
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

/**
 * Copies a share link (or a revealed secret) without leaving a trace in
 * Raycast's Clipboard History or other clipboard managers: the link carries
 * the decryption key, so it must not be archived.
 */
export async function copyConcealed(text: string): Promise<void> {
  await Clipboard.copy(text, { concealed: true });
}

function b64urlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function b64urlDecode(text: string): Uint8Array {
  return new Uint8Array(Buffer.from(text, "base64url"));
}

async function encryptSecret(plaintext: string): Promise<{ keyB64: string; payloadB64: string }> {
  const key = await webcrypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
  const nonce = webcrypto.getRandomValues(new Uint8Array(NONCE_BYTES));
  const ciphertext = new Uint8Array(
    await webcrypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, key, new TextEncoder().encode(plaintext)),
  );
  const rawKey = new Uint8Array(await webcrypto.subtle.exportKey("raw", key));
  const payload = new Uint8Array(NONCE_BYTES + ciphertext.length);
  payload.set(nonce);
  payload.set(ciphertext, NONCE_BYTES);
  return { keyB64: b64urlEncode(rawKey), payloadB64: b64urlEncode(payload) };
}

/** Inverse of encryptSecret: same layout as the web page and the CLI. */
export async function decryptSecret(keyB64: string, payloadB64: string): Promise<string> {
  const rawKey = b64urlDecode(keyB64);
  const payload = b64urlDecode(payloadB64);
  if (rawKey.length !== KEY_BYTES) {
    throw new Error("The decryption key in this link is malformed.");
  }
  if (payload.length <= NONCE_BYTES) {
    throw new Error("The encrypted payload returned by the server is malformed.");
  }
  const key = await webcrypto.subtle.importKey("raw", rawKey, { name: "AES-GCM" }, false, ["decrypt"]);
  try {
    const plaintext = await webcrypto.subtle.decrypt(
      { name: "AES-GCM", iv: payload.subarray(0, NONCE_BYTES) },
      key,
      payload.subarray(NONCE_BYTES),
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new Error("Could not decrypt this secret: the key in the link does not match.");
  }
}

/**
 * Creates a zero-knowledge secret: encrypted locally with AES-256-GCM, the key
 * only ever lives in the link's #k= fragment (never sent to any server).
 * The plaintext never leaves the device: servers without the zero-knowledge
 * endpoint are rejected instead of falling back to server-side encryption.
 */
export async function createSecret(
  secret: string,
  expirationTimestamp: number,
  selfDestruct: boolean,
): Promise<string> {
  // The server caps the *stored payload* (nonce + ciphertext + tag), not the
  // plaintext, so account for the overhead or near-limit secrets slip past this
  // check and fail with a raw server error instead of this message.
  const payloadBytes = Buffer.byteLength(secret, "utf8") + PAYLOAD_OVERHEAD_BYTES;
  if (payloadBytes > MAX_SECRET_BYTES) {
    throw new Error(`Secret is too large (${Math.ceil(payloadBytes / 1024)} KB once encrypted). The maximum is 64 KB.`);
  }

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
    throw new Error(
      "This server does not support zero-knowledge secrets (Whisper 1.3 or newer required). Upgrade it or point the extension to the hosted instance.",
    );
  }
  if (response.status !== 201) {
    const body = await response.text();
    const detail = body.trim().slice(0, 100);
    throw new Error(`Whisper server error (${response.status}). ${detail || "Please try again later."}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("Unexpected response from Whisper server: expected JSON with a secret id.");
  }
  const id = (data as { id?: unknown } | null)?.id;
  if (typeof id !== "string" || id.length === 0) {
    throw new Error("Unexpected response from Whisper server: missing secret id.");
  }
  return `${base}/get_secret?shared_secret_id=${encodeURIComponent(id)}#k=${keyB64}`;
}

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Path a share link points at; everything before it is the server's base URL. */
const SHARE_PATH = "/get_secret";

function isLoopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]" ||
    hostname === "::1"
  );
}

/**
 * A legacy (server-encrypted) secret is returned as plaintext, so retrieving one
 * over plain HTTP would put it on the wire in the clear. Loopback is allowed so
 * local development still works.
 */
function assertSafeTransport(url: URL): void {
  if (url.protocol !== "https:" && !isLoopback(url.hostname)) {
    throw new Error("Refusing to fetch a secret over plain HTTP. Use an https:// server.");
  }
}

export interface WhisperLink {
  /**
   * Base URL of the server holding the secret, including any path prefix
   * (a server at https://host/whisper keeps the /whisper). Taken from the link,
   * or from the configured server for a bare id.
   */
  baseUrl: string;
  id: string;
  /** base64url key from the #k= fragment; absent on legacy server-encrypted links. */
  key: string | null;
}

/** Accepts a full Whisper link or a bare secret id. Mirrors the CLI's ShareTarget parsing. */
export function parseWhisperLink(input: string): WhisperLink {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Paste a Whisper link first.");

  if (UUID_RE.test(trimmed)) {
    const configured = getWhisperUrl();
    assertSafeTransport(new URL(configured));
    return { baseUrl: configured, id: trimmed, key: null };
  }

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    throw new Error("This does not look like a Whisper link.");
  }
  assertSafeTransport(url);
  const id = url.searchParams.get("shared_secret_id");
  if (!id || !UUID_RE.test(id)) {
    throw new Error("This link has no valid secret id.");
  }
  const fragment = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  const key = fragment.startsWith("k=") ? fragment.slice(2) : null;
  // Strip only the share path, so a server hosted under a prefix keeps it.
  const prefixEnd = url.pathname.lastIndexOf(SHARE_PATH);
  const prefix = prefixEnd > 0 ? url.pathname.slice(0, prefixEnd) : "";
  return { baseUrl: url.origin + prefix, id, key: key && key.length > 0 ? key : null };
}

export function looksLikeWhisperLink(text: string | undefined): boolean {
  if (!text) return false;
  try {
    parseWhisperLink(text);
    return true;
  } catch {
    return false;
  }
}

export interface SecretMetadata {
  exists: boolean;
  clientEncrypted: boolean;
  selfDestruct: boolean;
}

/**
 * Non-consuming peek so we can warn before burning a self-destruct secret.
 * Returns null on servers that predate the /meta endpoint.
 */
export async function fetchSecretMetadata(link: WhisperLink): Promise<SecretMetadata | null> {
  let response: Response;
  try {
    response = await fetch(`${link.baseUrl}/secret/${link.id}/meta`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Could not reach Whisper server: ${message}`);
  }
  // A secret that is gone answers 404 *with* a metadata body, so the status
  // alone cannot separate "this secret no longer exists" from "this server has
  // no such route". Trust the body shape instead.
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  if (data !== null && typeof data === "object" && typeof (data as { exists?: unknown }).exists === "boolean") {
    const meta = data as { exists: boolean; client_encrypted?: unknown; self_destruct?: unknown };
    return {
      exists: meta.exists,
      clientEncrypted: meta.client_encrypted === true,
      selfDestruct: meta.self_destruct === true,
    };
  }
  // No metadata body. A server without the endpoint answers 404/405 in plain
  // text, and a 2xx we cannot read is no more informative, so fall back to the
  // "unknown" path rather than inventing an error for it.
  if (response.ok || response.status === 404 || response.status === 405) return null;
  throw new Error(`Whisper server error (${response.status}).`);
}

export interface RetrievedSecret {
  plaintext: string;
  selfDestruct: boolean;
  clientEncrypted: boolean;
}

/**
 * Fetches (and, for single-view links, consumes) the secret, then decrypts it
 * locally with the key from the link. Call fetchSecretMetadata first to get
 * the user's consent when the secret self-destructs.
 */
export async function retrieveSecret(link: WhisperLink): Promise<RetrievedSecret> {
  let response: Response;
  try {
    response = await fetch(`${link.baseUrl}/secret/${link.id}?source=raycast`, {
      headers: { Accept: "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network request failed";
    throw new Error(`Could not reach Whisper server: ${message}`);
  }
  if (response.status === 404) {
    throw new Error("Link unavailable: this secret expired, was already viewed, or never existed.");
  }
  if (!response.ok) {
    const body = await response.text();
    const detail = body.trim().slice(0, 100);
    throw new Error(`Whisper server error (${response.status}). ${detail || "Please try again later."}`);
  }

  let data: { secret?: unknown; self_destruct?: unknown; client_encrypted?: unknown };
  try {
    data = (await response.json()) as typeof data;
  } catch {
    throw new Error("Unexpected response from Whisper server: expected JSON.");
  }
  if (typeof data.secret !== "string") {
    throw new Error("Unexpected response from Whisper server: missing secret.");
  }

  const clientEncrypted = data.client_encrypted === true;
  const selfDestruct = data.self_destruct === true;
  if (!clientEncrypted) {
    return { plaintext: data.secret, selfDestruct, clientEncrypted };
  }
  if (!link.key) {
    throw new Error(
      "This secret is end-to-end encrypted but the link has no #k= key. Ask the sender for the full link.",
    );
  }
  return { plaintext: await decryptSecret(link.key, data.secret), selfDestruct, clientEncrypted };
}

export interface StructuredRow {
  /** Unique across the payload: a top-level "a › b" cannot collide with section a / key b. */
  id: string;
  label: string;
  value: string;
}

/** Flattens a Multiple Values payload (top-level and one level of sections) into rows. */
export function parseStructuredSecret(plaintext: string): StructuredRow[] | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(plaintext);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;

  const rows: StructuredRow[] = [];
  for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
    if (typeof value === "string") {
      rows.push({ id: JSON.stringify([key]), label: key, value });
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const [subKey, subValue] of Object.entries(value as Record<string, unknown>)) {
        if (typeof subValue !== "string") return null;
        rows.push({ id: JSON.stringify([key, subKey]), label: `${key} › ${subKey}`, value: subValue });
      }
    } else {
      return null;
    }
  }
  return rows.length > 0 ? rows : null;
}
