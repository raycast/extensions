import { closeTab, closeCurrentTab } from "../safari";

type Input = {
  /**
   * The tab to close.
   * @remarks
   * If not provided, the current active tab will be closed.
   */
  tab?: {
    /**
     * The window ID of the tab
     */
    windowId: number;

    /**
     * The index of the tab within the window
     */
    index: number;
  };
};

/**
 * Close a specific tab by window ID and tab index, or close the current active tab
 */
export default async function tool(input: Input) {
  const { tab } = input;
  if (tab) {
    return await closeTab(tab.windowId, tab.index);
  } else {
    return await closeCurrentTab();
  }
}
