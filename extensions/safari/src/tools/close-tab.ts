import { Action, Tool } from "@raycast/api";
import { closeTab, closeCurrentTab, getFocusedTab, getTab } from "../safari";

type Input = {
  /**
   * The tab to close.
   * @remarks
   * If not provided, the currently focused/active tab will be closed.
   */
  tab?: {
    /**
     * The window ID of the tab to close.
     * @remarks
     * Safari windows are numbered starting from 1.
     */
    windowId: number;

    /**
     * The index of the tab to close within the window.
     * @remarks
     * Tabs are numbered starting from 1, from left to right.
     */
    index: number;
  };
};

/**
 * Closes a Safari tab, either a specific tab identified by window ID and tab index,
 * or the currently focused tab if no specific tab is provided.
 * Returns the title and URL of the closed tab.
 */
export default async function tool(input: Input) {
  const { tab } = input;
  if (tab) {
    return await closeTab(tab.windowId, tab.index);
  } else {
    return await closeCurrentTab();
  }
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // A missing tab skips the confirmation; the tool then fails and closes nothing
  const tab = await (input.tab ? getTab(input.tab.windowId, input.tab.index) : getFocusedTab()).catch(() => undefined);
  if (!tab) return undefined;

  return {
    style: Action.Style.Destructive,
    message: "Close this tab?",
    info: [
      { name: "Title", value: tab.title },
      { name: "URL", value: tab.url },
    ],
  };
};
