import { LocalStorage, showHUD } from "@raycast/api";
import { refreshMenuBar } from "./utils/menu-bar-refresh";

/**
 * No-view command: stop tracking the current flight.
 *
 * Searchable/typeable from Raycast's root ("Clear Flight"). Removes the stored
 * flight number, clears cached data, and refreshes the menu bar so its item
 * disappears immediately.
 */
export default async function Command() {
  const stored = await LocalStorage.getItem<string>("flight-number");
  await LocalStorage.removeItem("flight-number");
  await refreshMenuBar();
  await showHUD(
    stored ? "✈ Flight tracking cleared" : "No flight was being tracked",
  );
}
