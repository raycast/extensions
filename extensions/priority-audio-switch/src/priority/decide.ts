// Pure priority-switching logic. No imports from Raycast or the audio layer so it can be unit-tested with node --test.

export type PriorityEntry = { uid: string; name: string };
export type DeviceRef = { uid: string; name: string };

/** What we remembered at the end of the previous run. */
export type Snapshot = { uids: string[]; currentUid: string; ts: number };

/** What the system looks like right now. */
export type Now = { devices: DeviceRef[]; currentUid: string; ts: number };

export type DecisionReason =
  | "no-snapshot"
  | "hidden-current"
  | "device-removed"
  | "woke-from-sleep"
  | "device-added"
  | "manual-switch"
  | "no-change"
  | "no-candidate";

export type Decision = {
  /** UID to switch to, or null when nothing should be switched. Never equal to the current UID. */
  target: string | null;
  reason: DecisionReason;
};

export type DecideInput = {
  prev: Snapshot | null;
  now: Now;
  /** Ordered best → worst. Position is the priority (no ties, no gaps). */
  priorities: PriorityEntry[];
  /** UIDs of hidden devices. */
  hidden: string[];
  /**
   * UIDs of devices without a priority that switch on connect ("Switch on Connect"). When one connects it becomes
   * current, whatever the priorities say, and stays first until the active device changes. After that the
   * priorities decide; it is only used when no device with a priority is available.
   */
  switchOnConnect?: string[];
  /** Background refresh interval, used for sleep/wake detection. */
  intervalMs: number;
};

/** A gap between runs longer than this many intervals is treated as sleep/wake. */
export const SLEEP_GAP_INTERVALS = 3;

// macOS uses a typographic apostrophe in Bluetooth names ("Jane’s AirPods"); treat all variants as equal.
export const normalizeName = (name: string) => name.replace(/[‘’ʼ]/g, "'");

/**
 * Index of the device in the priority list (lower is better), or -1 when unranked.
 * Matches by UID first. Falls back to the name, because USB UIDs can change with the port, but only when the match
 * is unambiguous: exactly one entry and exactly one connected device have that name, and the entry's UID is not
 * another connected device. Two "USB Audio Device"s never share a rank.
 * `devices` is everything connected in this direction (defaults to the device alone).
 */
export function rankOf(device: DeviceRef, priorities: PriorityEntry[], devices: DeviceRef[] = [device]): number {
  const byUid = priorities.findIndex((p) => p.uid === device.uid);
  if (byUid !== -1) return byUid;

  const name = normalizeName(device.name);
  const sameName = priorities.flatMap((p, index) => (normalizeName(p.name) === name ? [index] : []));
  if (sameName.length !== 1) return -1;
  const entry = priorities[sameName[0]];
  if (devices.some((d) => d.uid === entry.uid)) return -1;
  if (devices.filter((d) => normalizeName(d.name) === name).length > 1) return -1;
  return sameName[0];
}

/**
 * Whether two snapshots are the same. An automatic run compares the snapshot it started from with the stored one
 * before it switches: a manual choice (or another run) in between changed it, and the run must not undo that.
 */
export function sameSnapshot(a: Snapshot | null, b: Snapshot | null): boolean {
  if (!a || !b) return a === b;
  return a.currentUid === b.currentUid && a.ts === b.ts && a.uids.join("\n") === b.uids.join("\n");
}

/** Best ranked, non-hidden device among candidates. Unranked devices never win. `all` = every connected device. */
function bestOf(
  candidates: DeviceRef[],
  priorities: PriorityEntry[],
  hidden: Set<string>,
  all: DeviceRef[],
): DeviceRef | undefined {
  let best: DeviceRef | undefined;
  let bestRank = Infinity;
  for (const device of candidates) {
    if (hidden.has(device.uid)) continue;
    const rank = rankOf(device, priorities, all);
    if (rank !== -1 && rank < bestRank) {
      best = device;
      bestRank = rank;
    }
  }
  return best;
}

function pick(
  best: DeviceRef | undefined,
  currentUid: string,
  reason: DecisionReason,
  emptyReason: DecisionReason = "no-candidate",
): Decision {
  if (!best) return { target: null, reason: emptyReason };
  return { target: best.uid === currentUid ? null : best.uid, reason };
}

export function decide({ prev, now, priorities, hidden, intervalMs, switchOnConnect = [] }: DecideInput): Decision {
  const hiddenSet = new Set(hidden);
  const onConnect = new Set(switchOnConnect.filter((uid) => !hiddenSet.has(uid)));
  const firstOnConnect = (devices: DeviceRef[]) => devices.find((d) => onConnect.has(d.uid));
  /** Best device with a priority; a "Switch on Connect" device only when none is connected. */
  const bestAvailable = () => bestOf(now.devices, priorities, hiddenSet, now.devices) ?? firstOnConnect(now.devices);

  // 1. A hidden device became current → best available. A hidden device must never stay current, so when no device
  // has a priority or Switch on Connect, any visible device is used (the first one macOS lists).
  if (hiddenSet.has(now.currentUid)) {
    const anyVisible = now.devices.find((d) => !hiddenSet.has(d.uid));
    return pick(bestAvailable() ?? anyVisible, now.currentUid, "hidden-current");
  }

  // Nothing to compare with yet: just record a snapshot.
  if (!prev) return { target: null, reason: "no-snapshot" };

  const nowUids = new Set(now.devices.map((d) => d.uid));
  const prevUids = new Set(prev.uids);

  // 2. The device we were on disappeared → best available.
  if (!nowUids.has(prev.currentUid)) {
    return pick(bestAvailable(), now.currentUid, "device-removed");
  }

  const appeared = now.devices.filter((d) => !prevUids.has(d.uid) && !hiddenSet.has(d.uid));

  // 3a. A "Switch on Connect" device appeared → it becomes current.
  const connected = firstOnConnect(appeared);
  if (connected) return pick(connected, now.currentUid, "device-added");

  // Sleep/wake: the set may have changed unnoticed, treat as a connect event for everything.
  // A "Switch on Connect" device that is current stays: it did not connect again.
  if (now.ts - prev.ts > SLEEP_GAP_INTERVALS * intervalMs) {
    if (onConnect.has(now.currentUid)) return { target: null, reason: "woke-from-sleep" };
    return pick(bestAvailable(), now.currentUid, "woke-from-sleep");
  }

  // 3b. New devices appeared → best among {previous current} ∪ appeared.
  if (appeared.length > 0) {
    // A "Switch on Connect" device that took over is first until the active device changes: devices with a
    // priority that connect later do not replace it. After any change the normal priority logic applies.
    if (onConnect.has(prev.currentUid) && now.currentUid === prev.currentUid) {
      return { target: null, reason: "no-change" };
    }
    const previous = now.devices.find((d) => d.uid === prev.currentUid);
    const candidates = previous ? [previous, ...appeared] : appeared;
    return pick(bestOf(candidates, priorities, hiddenSet, now.devices), now.currentUid, "device-added", "no-change");
  }

  // 4. Same devices, different current device → the user switched manually. Respect it.
  if (now.currentUid !== prev.currentUid) return { target: null, reason: "manual-switch" };

  // 5. Nothing happened.
  return { target: null, reason: "no-change" };
}

/** Snapshot to store after a run (pass the UID the system ended up on, i.e. after any switch). */
export function makeSnapshot(devices: DeviceRef[], currentUid: string, ts: number): Snapshot {
  return { uids: devices.map((d) => d.uid), currentUid, ts };
}
