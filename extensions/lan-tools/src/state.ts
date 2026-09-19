import type { Device, StoredState } from "./types";

const STATE_KEY = "lanradar.state.v1";

export interface StorageAdapter {
  getItem(key: string): Promise<string | undefined>;
  setItem(key: string, value: string): Promise<void>;
}

const EMPTY: StoredState = {
  version: 1,
  prefs: { classMode: "instant" },
  devices: {},
  lastChanges: [],
};

export async function loadState(storage: StorageAdapter): Promise<StoredState> {
  try {
    const raw = await storage.getItem(STATE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as StoredState;
    if (parsed.version !== 1) return EMPTY;
    return parsed;
  } catch {
    return EMPTY;
  }
}

export async function saveState(
  state: StoredState,
  storage: StorageAdapter,
): Promise<void> {
  await storage.setItem(STATE_KEY, JSON.stringify(state));
}

/** Replace the device set; compute a change list vs the previous ring. */
export function mergeState(
  prev: StoredState,
  devices: Device[],
  sweptAt: number,
  network: { ip: string; prefixLen: number },
): StoredState {
  const now = sweptAt;
  const byMac: Record<string, Device> = {};
  for (const d of devices) byMac[d.mac] = d;

  const changes: { mac: string; kind: string; detail: string; at: number }[] =
    [];

  for (const [mac, dev] of Object.entries(byMac)) {
    const old = prev.devices[mac];
    if (!old) {
      changes.push({
        mac,
        kind: "discovered",
        detail: `${dev.name ?? mac} discovered`,
        at: now,
      });
    } else if (old.status !== dev.status) {
      changes.push({
        mac,
        kind: "status",
        detail: `${dev.name ?? mac}: ${old.status} → ${dev.status}`,
        at: now,
      });
    }
  }

  // Promotions: transient → stable (2nd observation).
  for (const [mac, dev] of Object.entries(byMac)) {
    const old = prev.devices[mac];
    if (old && old.bucket === "transient" && dev.bucket === "stable") {
      changes.push({
        mac,
        kind: "promoted",
        detail: `${dev.name ?? mac} promoted to stable`,
        at: now,
      });
    }
  }

  return {
    version: 1,
    prefs: prev.prefs,
    lastSweepAt: now,
    network,
    devices: byMac,
    lastChanges: changes.slice(0, 20),
  };
}

/** Bucket assignment: a device is stable after 2 observations or with a name. */
export function withStability(state: StoredState, devices: Device[]): Device[] {
  const counts = new Map<string, number>();
  for (const mac of Object.keys(state.devices)) {
    counts.set(mac, state.devices[mac].bucket === "stable" ? 2 : 1);
  }
  return devices.map((d) => {
    const c = (counts.get(d.mac) ?? 0) + 1;
    const hasName = !!d.name;
    const stable = hasName || c >= 2;
    return { ...d, bucket: stable ? "stable" : "transient" };
  });
}
