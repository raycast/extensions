import { getFocusedTab } from "../safari";

/**
 * Get information about the currently focused tab in Safari
 * @returns Details about the focused tab including title, URL, window ID, and tab index
 */
export default async function tool() {
  return await getFocusedTab();
}
