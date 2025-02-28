import { getTabContents, ContentType, getCurrentTabContents } from "../safari";

type Input = {
  /**
   * The tab to get the contents of.
   * @remarks
   * If not provided, the focused tab will be used.
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

  /**
   * The type of content to get.
   * @default "text"
   * @remarks
   * - "text" returns the text of the tab.
   * - "source" returns the HTML source code of the tab. Use only if you need the HTML source code.
   */
  type?: ContentType;
};

/**
 * Get the contents of a specific tab by window ID and tab index or the focused tab
 */
export default async function tool(input: Input) {
  const { tab, type = "text" } = input;
  if (tab) {
    return await getTabContents(tab.windowId, tab.index, type);
  } else {
    return await getCurrentTabContents(type);
  }
}
