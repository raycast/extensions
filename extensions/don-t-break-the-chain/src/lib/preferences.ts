import { getPreferenceValues } from "@raycast/api";
import { WeekStart } from "./month";

/** `drawn` is the pen-and-paper look; `emoji` swaps in ⬜ and ✅. */
export type CellStyle = "drawn" | "emoji";

type ChainPreferences = {
  weekStart: WeekStart;
  cellStyle: CellStyle;
  showDayLetters: boolean;
  name1?: string;
  name2?: string;
  name3?: string;
  name4?: string;
  name5?: string;
};

export function chainPreferences(): ChainPreferences {
  return getPreferenceValues<ChainPreferences>();
}

/** The user's name for a chain, falling back to `Chain N`. */
export function chainName(index: number): string {
  const preferences = chainPreferences() as Record<string, unknown>;
  const custom = preferences[`name${index}`];
  return typeof custom === "string" && custom.trim() !== "" ? custom.trim() : `Chain ${index}`;
}

/** `chain-3` → `3`. */
export function chainIndex(commandName: string): number {
  const index = Number(commandName.replace("chain-", ""));
  return Number.isInteger(index) && index >= 1 ? index : 1;
}
