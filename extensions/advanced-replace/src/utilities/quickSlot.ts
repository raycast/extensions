import { showToast, Toast, updateCommandMetadata } from "@raycast/api";
import { getSlotEntry } from "./storage";
import { performReplacement } from "./replacements";

/**
 * Runs the entry assigned to a quick slot. Used by the no-view `quick-slot-*`
 * commands so each can be bound to a native Raycast hotkey/alias.
 *
 * The command's subtitle is refreshed on every run via `updateCommandMetadata`
 * so the assigned entry (or "Unassigned") is visible from root search. Note that
 * `updateCommandMetadata` only updates the command it is called from, which is
 * why assignment happens in the list view but the subtitle syncs here on run.
 */
export async function runQuickSlot(slot: number, { resultType }: Preferences.QuickSlot1) {
  const entry = await getSlotEntry(slot);

  if (!entry) {
    await updateCommandMetadata({ subtitle: "Unassigned" });
    await showToast({
      style: Toast.Style.Failure,
      title: `Quick Slot ${slot} is empty`,
      message: 'Open "Extract and Replace Text", select an entry, then "Assign to Quick Slot".',
    });
    return;
  }

  await updateCommandMetadata({ subtitle: entry.title });
  await performReplacement(entry, resultType);
}
