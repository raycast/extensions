import { getPreferenceValues } from "@raycast/api";
import { sleep } from "../../utils";

/**
 * Sleep to get state changes
 */
export async function stateChangeSleep() {
  await sleep(1000);
}

export function hiddenEntitiesPreferences(): string[] {
  const prefs = getPreferenceValues();
  const hidden: string | undefined = prefs.hiddenEntities;
  if (!hidden) {
    return [];
  }
  return (hidden.split(",").map((h) => h.trim()) || []).filter((h) => h.length > 0);
}
