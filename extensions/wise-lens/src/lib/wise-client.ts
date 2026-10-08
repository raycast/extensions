import { ScaRequiredError, WiseHttpError } from "./errors";
import { ensureNotCoolingDown, markRateLimited } from "./rate-limit";

const WISE_HOST = "https://api.wise.com";

interface WiseGetOptions {
  signal?: AbortSignal;
  maxRetries?: number;
  skipCooldown?: boolean;
}

// Shared across all concurrent wiseGet callers so a burst of parallel requests
// (e.g. balances + activities in fetchDashboardSnapshot) cannot each exhaust an
// independent retry budget before cooldown engages.
let totalRetries = 0;
let activeBackoff: Promise<void> | null = null;

export async function wiseGet<T>(
  path: string,
  token: string,
  signalOrOptions?: AbortSignal | WiseGetOptions,
): Promise<T> {
  const opts: WiseGetOptions =
    signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const { signal, maxRetries = 2, skipCooldown = false } = opts;

  if (!skipCooldown) ensureNotCoolingDown();

  for (;;) {
    try {
      const result = await wiseGetOnce<T>(path, token, signal);
      totalRetries = 0;
      return result;
    } catch (e) {
      if (!(e instanceof WiseHttpError) || e.status !== 429) {
        // The retry sequence ended abnormally (abort, network drop, 5xx). Clear the
        // shared budget so the next caller doesn't inherit a stale mid-sequence count.
        totalRetries = 0;
        throw e;
      }
      if (!skipCooldown) ensureNotCoolingDown();

      totalRetries++;
      if (totalRetries > maxRetries) {
        markRateLimited();
        totalRetries = 0;
        if (!skipCooldown) ensureNotCoolingDown();
        throw e;
      }

      if (!activeBackoff) {
        const delayMs = 1000 * Math.pow(2, totalRetries - 1) + Math.random() * 250;
        const backoff = sleep(delayMs).finally(() => {
          if (activeBackoff === backoff) activeBackoff = null;
        });
        activeBackoff = backoff;
      }
      await activeBackoff;
    }
  }
}

async function wiseGetOnce<T>(path: string, token: string, signal?: AbortSignal): Promise<T> {
  const res = await fetch(`${WISE_HOST}${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    signal,
  });

  const text = await res.text();

  if (!res.ok) {
    if (res.status === 403) {
      const ott = res.headers.get("x-2fa-approval") || res.headers.get("X-2FA-Approval");
      if (ott) throw new ScaRequiredError();
    }
    const snippet = text.slice(0, 200).replace(/\s+/g, " ");
    throw new WiseHttpError(res.status, text, `Wise ${res.status}: ${snippet || res.statusText}`);
  }

  if (!text) return undefined as unknown as T;
  try {
    return JSON.parse(text) as T;
  } catch (e) {
    throw new WiseHttpError(res.status, text, `Wise: response is not JSON (${(e as Error).message})`);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
