import { getTabContents, ContentType, getCurrentTabContents } from "../safari";

type Input = {
  /**
   * The tab to get the contents of.
   * @remarks
   * If not provided, the currently focused/active tab will be used.
   */
  tab?: {
    /**
     * The window ID of the tab.
     * @remarks
     * Safari windows are numbered starting from 1.
     */
    windowId: number;

    /**
     * The index of the tab within the window.
     * @remarks
     * Tabs are numbered starting from 1, from left to right.
     */
    index: number;
  };

  /**
   * The type of content to retrieve from the tab.
   * @default "text"
   * @remarks
   * - "text" returns the visible text content (recommended for most uses)
   * - "source" returns the HTML source code (use only when HTML analysis is needed)
   */
  type?: ContentType;
};

/**
 * Retrieves the contents of a Safari tab, either the specified tab or the currently focused tab.
 * Returns either the visible text or HTML source code based on the type parameter.
 */
export default async function tool(input: Input) {
  const { tab, type = "text" } = input;
  if (tab) {
    return await getTabContents(tab.windowId, tab.index, type);
  } else {
    return await getCurrentTabContents(type);
  }
}
