import { Cache } from "@raycast/api";
import { createHash } from "node:crypto";
import { getConfig, listModels, Prefs, SetupError } from "./llm";

/** Result of checking the API key by loading the provider's models. */
export type KeyStatus = { ok: boolean; count?: number; error?: string };

const cache = new Cache({ namespace: "key-status" });

/** One entry per provider + host + key (hashed: the key itself is never stored here). */
function fingerprint(cfg: Prefs = getConfig()): string {
  const { provider, baseUrl, apiKey } = cfg;
  return createHash("sha256").update(`${provider.id}|${baseUrl}|${apiKey}`).digest("hex").slice(0, 16);
}

/** The last check for the current key, if it was checked. */
export function keyStatus(): KeyStatus | undefined {
  const raw = cache.get(fingerprint());
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as KeyStatus;
  } catch {
    return undefined;
  }
}

/**
 * Checks the current key once (AI Buddy calls it on open); `force` checks again.
 * A working key and a rejected key are remembered; a missing key or a network error is not, so it is
 * checked again next time.
 */
export async function checkKey(signal: AbortSignal, force = false): Promise<KeyStatus> {
  const known = force ? undefined : keyStatus();
  if (known) return known;
  try {
    const models = await listModels(signal);
    const status = { ok: true, count: models.length };
    cache.set(fingerprint(), JSON.stringify(status));
    return status;
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    const status = { ok: false, error: message.split("\n")[0] };
    if (!(e instanceof SetupError) && /^The API key/.test(message)) cache.set(fingerprint(), JSON.stringify(status));
    return status;
  }
}

/** AI Setup already checked this connection while you typed: no need to check it again on save. */
export function rememberStatus(cfg: Prefs, status: KeyStatus) {
  cache.set(fingerprint(cfg), JSON.stringify(status));
}
