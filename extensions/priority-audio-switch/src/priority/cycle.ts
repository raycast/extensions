// Pure logic for the cycle commands: step through the devices that have a priority, in priority order, then the
// "Switch on Connect" devices.
import type { DeviceRef, PriorityEntry } from "./decide";

/**
 * Connected, non-hidden devices that have a priority, ordered by priority (best first), followed by the connected
 * "Switch on Connect" devices (no priority) in the order given.
 * `priorities` should already be reconciled with the connected devices (see `reconcile`).
 */
export function cycleCandidates(
  priorities: PriorityEntry[],
  devices: DeviceRef[],
  hidden: string[],
  switchOnConnect: string[] = [],
): DeviceRef[] {
  const hiddenSet = new Set(hidden);
  const byUid = new Map(devices.map((d) => [d.uid, d]));
  const result: DeviceRef[] = [];
  for (const uid of [...priorities.map((p) => p.uid), ...switchOnConnect]) {
    const device = byUid.get(uid);
    if (device && !hiddenSet.has(device.uid) && !result.includes(device)) result.push(device);
  }
  return result;
}

/**
 * The device after the current one, wrapping around. When the current device is not among the candidates
 * (for example one without a priority) the cycle starts from the first. Returns undefined when there is nothing
 * to switch to.
 */
export function nextDevice(candidates: DeviceRef[], currentUid: string): DeviceRef | undefined {
  if (candidates.length === 0) return undefined;
  const index = candidates.findIndex((d) => d.uid === currentUid);
  if (index === -1) return candidates[0];
  const next = candidates[(index + 1) % candidates.length];
  return next.uid === currentUid ? undefined : next;
}
