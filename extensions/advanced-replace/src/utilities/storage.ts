import { confirmAlert, LocalStorage, showToast, Toast } from "@raycast/api";
import { Entry, SlotAssignments } from "../types";

const SLOT_KEY = "quickSlots";

export async function getSavedItems(): Promise<Entry[]> {
  return JSON.parse((await LocalStorage.getItem("regexOptions")) ?? JSON.stringify([]));
}

export async function setSavedItems(options: Entry[] | undefined) {
  if (!options) {
    await showToast({
      style: Toast.Style.Failure,
      title: "No options",
      message: "Nothing was saved",
    });
    return;
  }
  return LocalStorage.setItem("regexOptions", JSON.stringify(options));
}

export async function moveItem(fromIndex: number, toIndex: number, callbackFn?: () => void) {
  const savedItems = await getSavedItems();
  const len = savedItems.length;
  if (len === 0 || fromIndex === toIndex) return;
  if (fromIndex < 0 || fromIndex >= len || toIndex < 0 || toIndex >= len) return;

  const updatedEntries = savedItems.slice();
  const [movedItem] = updatedEntries.splice(fromIndex, 1);
  if (movedItem === undefined) return;
  updatedEntries.splice(toIndex, 0, movedItem);

  await setSavedItems(updatedEntries);
  callbackFn?.();
}

export async function deleteSavedItem(item: Entry) {
  if (
    await confirmAlert({
      title: "Really delete the item?",
      message: `You are about to delete the option ${item.title}.`,
    })
  ) {
    const savedItems = await getSavedItems();
    await setSavedItems(savedItems.filter((e) => e.id !== item.id));
    // Drop any quick-slot assignments that pointed at the deleted entry.
    await clearSlotsForEntry(item.id);
  } else {
    console.log("canceled");
  }
}

export async function getSlotAssignments(): Promise<SlotAssignments> {
  return JSON.parse((await LocalStorage.getItem(SLOT_KEY)) ?? "{}");
}

async function setSlotAssignments(assignments: SlotAssignments) {
  await LocalStorage.setItem(SLOT_KEY, JSON.stringify(assignments));
}

/** Resolves the entry currently assigned to a quick slot, or undefined if none/stale. */
export async function getSlotEntry(slot: number): Promise<Entry | undefined> {
  const assignments = await getSlotAssignments();
  const entryId = assignments[String(slot)];
  if (!entryId) return undefined;
  const savedItems = await getSavedItems();
  return savedItems.find((e) => e.id === entryId);
}

export async function assignSlot(slot: number, entryId: string) {
  const assignments = await getSlotAssignments();
  assignments[String(slot)] = entryId;
  await setSlotAssignments(assignments);
}

export async function clearSlot(slot: number) {
  const assignments = await getSlotAssignments();
  delete assignments[String(slot)];
  await setSlotAssignments(assignments);
}

async function clearSlotsForEntry(entryId: string) {
  const assignments = await getSlotAssignments();
  let changed = false;
  for (const [slot, id] of Object.entries(assignments)) {
    if (id === entryId) {
      delete assignments[slot];
      changed = true;
    }
  }
  if (changed) await setSlotAssignments(assignments);
}

export async function updateSavedItemDate(item: Entry) {
  const savedItems = await getSavedItems();

  const updatedItems = savedItems.map((e) => (e.id === item.id ? { ...e, lastUsed: new Date() } : e));

  await setSavedItems(updatedItems);
}
