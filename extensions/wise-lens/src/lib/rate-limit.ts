import { Cache } from "@raycast/api";
import { RATE_LIMIT_COOLDOWN_KEY } from "./cache-keys";

const COOLDOWN_MS = 5 * 60 * 1000;
const cache = new Cache();

export class RateLimitCooldownError extends Error {
  constructor(public readonly until: number) {
    super(`Wise rate-limit cooldown active until ${new Date(until).toLocaleTimeString()}`);
    this.name = "RateLimitCooldownError";
  }
}

export function getCooldownUntil(): number | null {
  const raw = cache.get(RATE_LIMIT_COOLDOWN_KEY);
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= Date.now()) {
    cache.remove(RATE_LIMIT_COOLDOWN_KEY);
    return null;
  }
  return n;
}

export function ensureNotCoolingDown(): void {
  const until = getCooldownUntil();
  if (until !== null) throw new RateLimitCooldownError(until);
}

export function markRateLimited(): number {
  const until = Date.now() + COOLDOWN_MS;
  cache.set(RATE_LIMIT_COOLDOWN_KEY, String(until));
  return until;
}

export function clearCooldown(): void {
  cache.remove(RATE_LIMIT_COOLDOWN_KEY);
}
