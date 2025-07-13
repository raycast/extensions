import { getFocusedTab } from "../safari";

/**
 * Retrieves information about the currently focused/active tab in Safari.
 *
 * @returns An object containing details about the focused tab including its title, URL,
 * window ID, and position within the window.
 *
 * This tool is useful for quickly identifying which tab the user is currently viewing
 * without having to search through all tabs.
 */
export default async function tool() {
  return await getFocusedTab();
}
