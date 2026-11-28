import { getFocusedTab } from "../dia";
import { AUTOMATION_PERMISSION_MESSAGE } from "../find-tab";

/**
 * Returns the tab the user is currently viewing in Dia: its window ID, tab ID, title and URL.
 */
export default async function tool() {
  const tab = await getFocusedTab();
  if (!tab) {
    throw new Error(
      `No focused tab found. Make sure Dia is open with at least one window. ${AUTOMATION_PERMISSION_MESSAGE}`,
    );
  }
  return tab;
}
