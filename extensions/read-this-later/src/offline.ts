// Reading captured article bodies.
//
// Bodies are end-to-end encrypted by whichever client captured them — the
// Worker only ever warehouses opaque ciphertext. The wire format is frozen and
// shared with the browser extension and the iOS app; readlater-sync/CRYPTO.md
// is the source of truth, and offline-body.test.ts asserts this file against
// that spec's frozen vector.
//
// This extension can only READ bodies. Capturing one requires running
// Readability against a live, logged-in DOM (that's what gets past paywalls),
// which Raycast has no way to do — re-fetching the URL server-side would just
// yield the paywalled stub the capture was meant to avoid.

import { getPreferenceValues } from "@raycast/api";
import { hkdfSync, createDecipheriv } from "node:crypto";
import { BASE_URL, BODY_TIMEOUT_MS, fetchWithTimeout } from "./service";

// Frozen — changing any of these breaks interop with every other client.
const HKDF_SALT = "rtl-offline-v1";
const HKDF_INFO = "body";
const KEY_LEN_BYTES = 32;
const IV_LEN_BYTES = 12;
const TAG_LEN_BYTES = 16;

// The decrypted plaintext is a JSON envelope, NOT bare HTML: the title and
// other metadata live inside the ciphertext so the Worker can't read them.
export interface OfflineArticle {
  v?: number;
  url: string;
  title: string;
  siteName?: string;
  excerpt?: string;
  length?: number;
  html: string;
  capturedAt?: number;
}

export function deriveKey(syncToken: string): Buffer {
  return Buffer.from(
    hkdfSync(
      "sha256",
      Buffer.from(syncToken, "utf8"),
      Buffer.from(HKDF_SALT, "utf8"),
      Buffer.from(HKDF_INFO, "utf8"),
      KEY_LEN_BYTES,
    ),
  );
}

// wire = base64( iv ‖ ciphertext ‖ tag ). Throws if the token is wrong or the
// blob was tampered with — GCM authenticates, so this can't return garbage.
export function decryptBody(wireBase64: string, syncToken: string): string {
  const raw = Buffer.from(wireBase64, "base64");
  if (raw.length <= IV_LEN_BYTES + TAG_LEN_BYTES) {
    throw new Error("Offline copy is corrupt.");
  }

  const iv = raw.subarray(0, IV_LEN_BYTES);
  const tag = raw.subarray(raw.length - TAG_LEN_BYTES);
  const ciphertext = raw.subarray(IV_LEN_BYTES, raw.length - TAG_LEN_BYTES);

  const decipher = createDecipheriv("aes-256-gcm", deriveKey(syncToken), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

export function parseEnvelope(plaintext: string): OfflineArticle {
  const env = JSON.parse(plaintext);
  return {
    v: env.v,
    url: env.url ?? "",
    title: env.title ?? "",
    siteName: env.siteName ?? "",
    excerpt: env.excerpt ?? "",
    length: env.length ?? 0,
    html: env.html ?? "",
    capturedAt: env.capturedAt,
  };
}

// Returns null when no body was ever uploaded — e.g. the item was saved before
// offline capture existed, or the capture hit a paywalled stub and gave up.
export async function fetchArticle(
  articleUrl: string,
): Promise<OfflineArticle | null> {
  const { syncToken } = getPreferenceValues<Preferences>();

  let response: Response;
  try {
    response = await fetchWithTimeout(
      `${BASE_URL}/body?url=${encodeURIComponent(articleUrl)}`,
      { headers: { Authorization: `Bearer ${syncToken}` } },
      BODY_TIMEOUT_MS,
    );
  } catch {
    throw new Error("Couldn't reach the Research Sync service.");
  }

  if (response.status === 404) return null;
  if (response.status === 401 || response.status === 403) {
    throw new Error("Sync token rejected.");
  }
  if (!response.ok) {
    throw new Error(`Couldn't fetch the article (HTTP ${response.status}).`);
  }

  const record = (await response.json()) as { ciphertext?: string };
  if (!record.ciphertext) return null;

  // A failure here means the token can't open this blob — decryption is
  // authenticated, so this is a real key mismatch, not a corrupt render.
  return parseEnvelope(decryptBody(record.ciphertext, syncToken));
}
