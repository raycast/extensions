import { getPreferenceValues } from "@raycast/api";
import { runQuickSlot } from "./utilities/quickSlot";

export default async function Command() {
  await runQuickSlot(6, getPreferenceValues<Preferences.QuickSlot6>());
}
