import { LocalStorage } from "@raycast/api";
import { CachedDevice, DeviceKind } from "./types";

const KEY = "tapo_cached_devices_v1";

type CacheShape = Record<DeviceKind, CachedDevice | null>;

function now() {
  return Date.now();
}

export async function getCache(): Promise<CacheShape> {
  const raw = await LocalStorage.getItem<string>(KEY);
  if (!raw) return { P110: null, L530: null };

  try {
    const parsed = JSON.parse(raw) as CacheShape;
    return {
      P110: parsed.P110 ?? null,
      L530: parsed.L530 ?? null,
    };
  } catch {
    return { P110: null, L530: null };
  }
}

export async function setCachedDevice(kind: DeviceKind, ip: string, alias?: string) {
  const cache = await getCache();
  const next: CacheShape = {
    ...cache,
    [kind]: {
      kind,
      ip,
      alias,
      lastSeenAt: now(),
    },
  };
  await LocalStorage.setItem(KEY, JSON.stringify(next));
}

export async function touchDevice(kind: DeviceKind) {
  const cache = await getCache();
  const d = cache[kind];
  if (!d) return;
  d.lastSeenAt = now();
  await LocalStorage.setItem(KEY, JSON.stringify(cache));
}

export async function clearCache() {
  await LocalStorage.removeItem(KEY);
}