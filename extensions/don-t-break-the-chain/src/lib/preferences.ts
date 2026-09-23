import { getPreferenceValues } from "@raycast/api";

/**
 * `drawn` is the pen-and-paper look; `emoji` swaps in ⬜ and ✅. Taken from the
 * generated preference type so the manifest stays the single source of truth.
 */
export type CellStyle = Preferences["cellStyle"];

/** Chain names are separate preferences, so they are looked up by key. */
const NAME_KEYS = ["name1", "name2", "name3", "name4", "name5"] as const;

export function chainPreferences(): Preferences {
  return getPreferenceValues<Preferences>();
}

/** The user's name for a chain, falling back to `Chain N`. */
export function chainName(index: number): string {
  const key = NAME_KEYS[index - 1];
  const custom = key === undefined ? undefined : chainPreferences()[key];
  return custom !== undefined && custom.trim() !== "" ? custom.trim() : `Chain ${index}`;
}

/** `chain-3` → `3`. */
export function chainIndex(commandName: string): number {
  const index = Number(commandName.replace("chain-", ""));
  return Number.isInteger(index) && index >= 1 ? index : 1;
}
