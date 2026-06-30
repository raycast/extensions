import { LocalStorage } from "@raycast/api";

/** A monitor bound to a shortcut slot. Stored by stable device id. */
export interface SlotAssignment {
  id: string;
  name: string;
}

/** Number of per-monitor shortcut commands declared in package.json (toggle-hdr-1..N). */
export const SLOT_COUNT = 4;

const key = (slot: number) => `hdr-slot-${slot}`;

export async function getSlot(
  slot: number,
): Promise<SlotAssignment | undefined> {
  const raw = await LocalStorage.getItem<string>(key(slot));
  if (!raw) return undefined;
  try {
    return JSON.parse(raw) as SlotAssignment;
  } catch {
    return undefined;
  }
}

/** Bind a monitor to a slot. A monitor lives in at most one slot, so clear it elsewhere. */
export async function setSlot(
  slot: number,
  assignment: SlotAssignment,
): Promise<void> {
  for (let i = 1; i <= SLOT_COUNT; i++) {
    if (i === slot) continue;
    const existing = await getSlot(i);
    if (existing?.id === assignment.id) {
      await LocalStorage.removeItem(key(i));
    }
  }
  await LocalStorage.setItem(key(slot), JSON.stringify(assignment));
}

export async function clearSlot(slot: number): Promise<void> {
  await LocalStorage.removeItem(key(slot));
}

export async function getAllSlots(): Promise<Record<number, SlotAssignment>> {
  const result: Record<number, SlotAssignment> = {};
  for (let i = 1; i <= SLOT_COUNT; i++) {
    const assignment = await getSlot(i);
    if (assignment) result[i] = assignment;
  }
  return result;
}

/** The slot number a monitor id is currently bound to, or undefined. */
export function slotForId(
  slots: Record<number, SlotAssignment>,
  id: string,
): number | undefined {
  for (const [n, assignment] of Object.entries(slots)) {
    if (assignment.id === id) return Number(n);
  }
  return undefined;
}
