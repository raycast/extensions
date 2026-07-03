// Network resolution of a token's verification key, kept apart from the pure
// crypto in `jwt.ts`. Given a decoded token, find a public key from (in order):
// an embedded `jwk` or `x5c` header, a `jku`/`x5u` URL, or — failing those —
// OIDC discovery from the `iss` claim (`/.well-known/openid-configuration`, then
// the conventional `/.well-known/jwks.json`). All of this runs only on explicit
// user request, so the (deliberate) outbound requests to token-controlled URLs
// are never made automatically.

import { type KeyObject } from "node:crypto";
import { type DecodedJwt, certToKey, jwkToKey, x5cToKey } from "./jwt";

const FETCH_TIMEOUT_MS = 10_000;

type Jwk = { kid?: string; alg?: string; use?: string; [key: string]: unknown };
type JwkSet = { keys?: Jwk[] };

export type ResolvedKey = { key: KeyObject; source: string };

async function fetchWithTimeout(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}.`);
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") throw new Error(`Request to ${url} timed out.`);
    throw error instanceof Error ? error : new Error(String(error));
  } finally {
    clearTimeout(timer);
  }
}

async function fetchJson(url: string): Promise<Record<string, unknown>> {
  return (await (await fetchWithTimeout(url)).json()) as Record<string, unknown>;
}

/** Pick the right JWK from a set: by the token's `kid`, or the sole key if there's only one. */
function selectJwk(set: JwkSet, kid: string | undefined): Jwk {
  const keys = set.keys ?? [];
  if (keys.length === 0) throw new Error("The JWK Set contains no keys.");
  if (kid) {
    const match = keys.find((key) => key.kid === kid);
    if (!match) throw new Error(`No key in the set matches the token's kid "${kid}".`);
    return match;
  }
  if (keys.length === 1) return keys[0];
  throw new Error("The JWK Set has multiple keys but the token header has no kid to choose one.");
}

async function keyFromJwksUrl(url: string, kid: string | undefined): Promise<KeyObject> {
  return jwkToKey(selectJwk((await fetchJson(url)) as JwkSet, kid) as Parameters<typeof jwkToKey>[0]);
}

/** OIDC discovery: the configuration document's `jwks_uri`, else the conventional path. */
async function discoverJwksUri(iss: string): Promise<string> {
  const base = iss.replace(/\/+$/, "");
  try {
    const conf = await fetchJson(`${base}/.well-known/openid-configuration`);
    if (typeof conf.jwks_uri === "string") return conf.jwks_uri;
  } catch {
    // No discovery document — fall back to the conventional JWKS location below.
  }
  return `${base}/.well-known/jwks.json`;
}

/**
 * Resolve a public key for the token, returning it with a human-readable note of
 * where it came from. Throws (with a specific message) when no source is available
 * or a fetch fails.
 */
export async function resolveVerificationKey(decoded: DecodedJwt): Promise<ResolvedKey> {
  const { header, payload } = decoded;
  const kid = typeof header.kid === "string" ? header.kid : undefined;

  if (header.jwk && typeof header.jwk === "object") {
    return { key: jwkToKey(header.jwk as Parameters<typeof jwkToKey>[0]), source: "the jwk in the token header" };
  }
  if (Array.isArray(header.x5c) && typeof header.x5c[0] === "string") {
    return { key: x5cToKey(header.x5c[0]), source: "the x5c certificate in the token header" };
  }
  if (typeof header.jku === "string") {
    return { key: await keyFromJwksUrl(header.jku, kid), source: `jku ${header.jku}` };
  }
  if (typeof header.x5u === "string") {
    return { key: certToKey(await (await fetchWithTimeout(header.x5u)).text()), source: `x5u ${header.x5u}` };
  }
  if (typeof payload.iss === "string") {
    const uri = await discoverJwksUri(payload.iss);
    return { key: await keyFromJwksUrl(uri, kid), source: `OIDC discovery → ${uri}` };
  }
  throw new Error("No public-key source: the token has no jwk/x5c/jku/x5u header and no iss claim to discover from.");
}
