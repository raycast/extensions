import { getTabs } from "../dia";
import { AUTOMATION_PERMISSION_MESSAGE } from "../find-tab";
import { filterTabs } from "../utils";

type Input = {
  /**
   * Text to filter tabs by title or URL (case-insensitive).
   *
   * @remarks
   * Omit it to return every open tab.
   */
  query?: string;
};

/**
 * Returns the open tabs across all Dia windows, including pinned tabs.
 * Each tab has its window ID, tab ID, title, URL, and whether it is pinned or focused.
 */
export default async function tool(input: Input) {
  const tabs = await getTabs();
  // Tab fetching swallows errors, so a denied Automation permission also returns no tabs
  if (tabs.length === 0) {
    throw new Error(`No open tabs found in Dia. Make sure Dia is open. ${AUTOMATION_PERMISSION_MESSAGE}`);
  }
  return input.query?.trim() ? (filterTabs(tabs, input.query.trim()) ?? []) : tabs;
}
