/**
 * DEV ONLY. Request signing for a SnapTrade *Personal* API key (clientId + consumerKey).
 *
 * This is not Bearer auth. SnapTrade personal keys sign every request with
 * HMAC-SHA256(consumerKey, sortedJson({ content, path, query })) and send
 * `clientId` + `timestamp` as query params plus a `Signature` header. This mirrors the
 * official snaptrade-typescript-sdk (`requestBeforeHook` / `requestAfterHook`).
 *
 * The Store build never uses this path: `enableDevPersonalKey` defaults to false and the
 * consumer key only ever lives in Raycast's password preference on the developer's Mac.
 */
import { createHmac } from "node:crypto";

export interface PersonalCredentials {
  clientId: string;
  consumerKey: string;
}

/** JSON.stringify with keys sorted at every level (matches the SDK's JSONstringifyOrder). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out;
  }
  return value;
}

export function personalSignature(consumerKey: string, path: string, query: string, content: unknown | null): string {
  const message = stableStringify({ content: content ?? null, path, query });
  return createHmac("sha256", encodeURI(consumerKey)).update(message).digest("base64");
}

/**
 * Builds the signed URL + headers for one request.
 * `path` is the API path relative to the API root, e.g. "/accounts". `apiBase` has no trailing slash.
 */
export function signPersonalRequest(
  creds: PersonalCredentials,
  apiBase: string,
  path: string,
  query: Record<string, string | number | undefined>,
  body: unknown | undefined,
  now: Date = new Date(),
): { url: string; headers: Record<string, string> } {
  const params = new URLSearchParams();
  params.set("clientId", creds.clientId);
  for (const [k, v] of Object.entries(query)) {
    if (v !== undefined && v !== null && v !== "") params.set(k, String(v));
  }
  params.set("timestamp", Math.round(now.getTime() / 1000).toString());
  const queryString = params.toString();
  const signature = personalSignature(creds.consumerKey, path, queryString, body === undefined ? null : body);
  return { url: `${apiBase}${path}?${queryString}`, headers: { Signature: signature } };
}
