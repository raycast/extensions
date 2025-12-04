import { getAllTabs } from "../safari";

/**
 * Retrieves information about all open tabs across all Safari windows.
 *
 * @returns An array of tab objects containing details about each tab, including
 * titles, URLs, and their location (window ID and position).
 *
 * This tool is useful for getting a complete overview of all open Safari tabs,
 * allowing for operations on specific tabs based on their content or location.
 * The returned array is ordered by window ID and then by tab position.
 */
export default async function tool() {
  return await getAllTabs();
}
