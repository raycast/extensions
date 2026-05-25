import { ScaRequiredError, WiseHttpError } from "./errors";
import { ensureNotCoolingDown, markRateLimited } from "./rate-limit";

const WISE_HOST = "https://api.wise.com";

interface WiseGetOptions {
  signal?: AbortSignal;
  maxRetries?: number;
  skipCooldown?: boolean;
}

export async function wiseGet<T>(
  path: string,
  token: string,
  signalOrOptions?: AbortSignal | WiseGetOptions,
): Promise<T> {
  const opts: WiseGetOptions =
    signalOrOptions instanceof AbortSignal ? { signal: signalOrOptions } : (signalOrOptions ?? {});
  const { signal, maxRetries = 2, skipCooldown = false } = opts;

  if (!skipCooldown) ensureNotCoolingDown();

  let attempt = 0;
  let lastErr: unknown;
  while (attempt <= maxRetries) {
    try {
      return await wiseGetOnce<T>(path, token, signal);
    } catch (e) {
      lastErr = e;
      if (!(e instanceof WiseHttpError) || e.status !== 429) throw e;
      attempt++;
      if (attempt > maxRetries) {
        markRateLimited();
        break;
      }
      const delayMs = 1000 * Math.pow(2, attempt - 1) + Math.random() * 250;
      await sleep(delayMs);
    }
  }
  throw lastErr;
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
