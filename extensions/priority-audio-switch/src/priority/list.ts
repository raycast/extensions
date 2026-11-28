// Pure operations on a priority list (ordered best → worst). Position in the array is the priority,
// so there are never ties or gaps. All functions return a new array.
import { normalizeName, type DeviceRef, type PriorityEntry } from "./decide";

const clamp = (n: number, min: number, max: number) => Math.min(Math.max(n, min), max);

/** Priorities go from 1 to 5. Putting a device into a full list pushes the last one out. */
export const MAX_PRIORITY = 5;

/** 1-based priority number for display, or undefined when unranked. */
export function priorityNumber(list: PriorityEntry[], uid: string): number | undefined {
  const index = list.findIndex((p) => p.uid === uid);
  return index === -1 ? undefined : index + 1;
}

/**
 * Put a device at a 1-based position (clamped to the list). Adds it when unranked, moves it when ranked.
 * Omit `position` to append at the end. The result has at most MAX_PRIORITY entries: in a full list the last entry
 * is pushed out (see `droppedEntries`); appending to a full list is a no-op.
 */
export function setPosition(list: PriorityEntry[], entry: PriorityEntry, position?: number): PriorityEntry[] {
  const rest = list.filter((p) => p.uid !== entry.uid);
  const index = position === undefined ? rest.length : clamp(Math.trunc(position) - 1, 0, rest.length);
  if (index >= MAX_PRIORITY) return list;
  return [...rest.slice(0, index), { uid: entry.uid, name: entry.name }, ...rest.slice(index)].slice(0, MAX_PRIORITY);
}

/** Entries of `before` that are missing from `after`, for telling the user who lost a priority. */
export function droppedEntries(before: PriorityEntry[], after: PriorityEntry[], except?: string): PriorityEntry[] {
  const kept = new Set(after.map((p) => p.uid));
  return before.filter((p) => !kept.has(p.uid) && p.uid !== except);
}

export const makeTop = (list: PriorityEntry[], entry: PriorityEntry) => setPosition(list, entry, 1);

/** Move a ranked device by `delta` positions (negative = higher priority). Unranked devices are left alone. */
export function moveBy(list: PriorityEntry[], uid: string, delta: number): PriorityEntry[] {
  const index = list.findIndex((p) => p.uid === uid);
  if (index === -1) return list;
  return setPosition(list, list[index], index + 1 + delta);
}

export function removeEntry(list: PriorityEntry[], uid: string): PriorityEntry[] {
  return list.filter((p) => p.uid !== uid);
}

/**
 * Keep stored entries in sync with what is connected:
 * - a UID match refreshes the stored name (so the name fallback stays current);
 * - an entry whose UID is absent but whose name matches exactly one unclaimed connected device adopts that
 *   device's UID (USB UIDs can change with the port).
 * Entries for devices that are not connected are kept as they are.
 */
export function reconcile(list: PriorityEntry[], devices: DeviceRef[]): PriorityEntry[] {
  const byUid = new Map(devices.map((d) => [d.uid, d]));
  const claimed = new Set(list.map((p) => p.uid).filter((uid) => byUid.has(uid)));

  return list.map((entry) => {
    const exact = byUid.get(entry.uid);
    if (exact) return exact.name === entry.name ? entry : { uid: entry.uid, name: exact.name };

    const name = normalizeName(entry.name);
    const candidates = devices.filter((d) => !claimed.has(d.uid) && normalizeName(d.name) === name);
    if (candidates.length !== 1) return entry;
    claimed.add(candidates[0].uid);
    return { uid: candidates[0].uid, name: candidates[0].name };
  });
}
