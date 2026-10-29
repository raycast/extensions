import { LocalStorage } from "@raycast/api";
import { LeaseStorage, withLeaseLock } from "./storage-lock";

const REFRESH_LOCK_KEY = "refresh-lock.v2";
const MARKET_STATE_LOCK_KEY = "market-state-lock.v1";

const storage: LeaseStorage = {
  getItem: (key) => LocalStorage.getItem<string>(key),
  setItem: (key, value) => LocalStorage.setItem(key, value),
  removeItem: (key) => LocalStorage.removeItem(key),
};

export function withRefreshLock<Value>(
  work: (signal: AbortSignal) => Promise<Value>,
) {
  return withLeaseLock(storage, REFRESH_LOCK_KEY, work, {
    leaseMs: 60_000,
    heartbeatMs: 10_000,
    waitTimeoutMs: 1_000,
  });
}

export function withMarketStateLock<Value>(
  work: (signal: AbortSignal) => Promise<Value>,
) {
  return withLeaseLock(storage, MARKET_STATE_LOCK_KEY, work, {
    leaseMs: 5_000,
    heartbeatMs: 1_000,
    waitTimeoutMs: 5_000,
  });
}
