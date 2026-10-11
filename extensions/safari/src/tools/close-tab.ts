import { Action, LocalStorage, Tool } from "@raycast/api";
import { closeTarget, ConfirmedTab, takeConfirmed } from "../confirmed-tab";
import { closePinnedTab, resolveTab } from "../safari";

// The confirmation and the tool run separately, so the confirmed tab is handed over through LocalStorage
const CONFIRMED_TAB_KEY = "close-tab:confirmed";

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
 * Closes exactly the tab shown in the confirmation. It fails without closing anything if that tab moved or changed
 * page, or if there is no matching confirmation for this call.
 * Returns the title and URL of the closed tab.
 */
export default async function tool(input: Input) {
  const stored = await LocalStorage.getItem<string>(CONFIRMED_TAB_KEY);
  await LocalStorage.removeItem(CONFIRMED_TAB_KEY);
  const confirmed = takeConfirmed(stored, closeTarget(input.tab), Date.now());
  if ("error" in confirmed) throw new Error(confirmed.error);
  return await closePinnedTab(confirmed.tab);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const target = closeTarget(input.tab);
  try {
    const tab = await resolveTab(input.tab);
    const confirmed: ConfirmedTab = { target, tab, confirmedAt: Date.now() };
    await LocalStorage.setItem(CONFIRMED_TAB_KEY, JSON.stringify(confirmed));
    return {
      style: Action.Style.Destructive,
      message: "Close this tab?",
      info: [
        { name: "Title", value: tab.title },
        { name: "URL", value: tab.url },
      ],
    };
  } catch (error) {
    // A missing tab skips the confirmation; the tool then reports why and closes nothing
    const message = error instanceof Error ? error.message : String(error);
    const confirmed: ConfirmedTab = { target, error: message, confirmedAt: Date.now() };
    await LocalStorage.setItem(CONFIRMED_TAB_KEY, JSON.stringify(confirmed));
    return undefined;
  }
};
