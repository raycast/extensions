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

  /**
   * Name of a Dia space to return tabs from, e.g. "Work" (case-insensitive).
   *
   * @remarks
   * Take it from get-spaces or a previous tab's space. Omit it to return tabs from every space.
   */
  space?: string;
};

/**
 * Returns the open tabs across all Dia windows and spaces, including pinned tabs and tabs in spaces a window isn't showing.
 * Each tab has its window ID, tab ID, title, URL, space name, whether its space is the one shown in its window
 * (isActiveSpace), and whether it is pinned or focused.
 */
export default async function tool(input: Input) {
  // A space remembers its last tab even when hidden; only the space a window shows has the tab the user sees
  const tabs = (await getTabs({ allSpaces: true })).map((tab) => ({
    ...tab,
    isFocused: tab.isFocused && tab.isActiveSpace,
  }));
  // Tab fetching swallows errors, so a denied Automation permission also returns no tabs
  if (tabs.length === 0) {
    throw new Error(`No open tabs found in Dia. Make sure Dia is open. ${AUTOMATION_PERMISSION_MESSAGE}`);
  }
  const space = input.space?.trim().toLowerCase();
  const inSpace = space ? tabs.filter((tab) => tab.space?.toLowerCase() === space) : tabs;
  return input.query?.trim() ? (filterTabs(inSpace, input.query.trim()) ?? []) : inSpace;
}
