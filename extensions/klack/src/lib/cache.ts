import { Cache } from "@raycast/api";
import type { KlackState } from "./types";

const STATE_KEY = "klack.state.v1";
const INSTALL_KEY = "klack.installed.v1";
const INSTALL_TTL_MS = 60 * 60 * 1000;

const cache = new Cache();

export function readCachedState(): KlackState | undefined {
  const raw = cache.get(STATE_KEY);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as KlackState;
  } catch {
    return undefined;
  }
}

export function writeCachedState(patch: Partial<KlackState>) {
  const prev = readCachedState();
  const next = { enabled: false, sleeping: false, switch: "None", volume: 60, ...prev, ...patch };
  cache.set(STATE_KEY, JSON.stringify(next));
}

export function markInstallVerified() {
  cache.set(INSTALL_KEY, String(Date.now()));
}

export function isInstallVerifiedFresh(): boolean {
  return Date.now() - Number(cache.get(INSTALL_KEY) ?? 0) < INSTALL_TTL_MS;
}
