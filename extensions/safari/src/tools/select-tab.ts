import { selectTab } from "../safari";

type Input = {
  /**
   * The window ID of the tab to select.
   * @remarks
   * Safari windows are numbered starting from 1, frontmost first. Use get-all-tabs to find it.
   */
  windowId: number;

  /**
   * The index of the tab to select within the window.
   * @remarks
   * Tabs are numbered starting from 1, from left to right. Use get-all-tabs to find it.
   */
  index: number;
};

/**
 * Switches to a Safari tab and brings its window to the front.
 * Returns the selected tab. Its window becomes window 1, so window IDs from earlier results may have changed.
 */
export default async function tool(input: Input) {
  return await selectTab(input.windowId, input.index);
}
