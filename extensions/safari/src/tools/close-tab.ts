import { Action, LocalStorage, Tool } from "@raycast/api";
import { closePinnedTab, PinnedTab, resolveTab } from "../safari";

// The confirmation and the tool run separately, so the confirmed tab is handed over through LocalStorage
const CONFIRMED_TAB_KEY = "close-tab:confirmed";
const CONFIRMED_TAB_MAX_AGE_MS = 10 * 60 * 1000;

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

type ConfirmedTab = { target: string; tab: PinnedTab; confirmedAt: number };

const targetKey = (input: Input) => JSON.stringify(input.tab ? [input.tab.windowId, input.tab.index] : "current");

/**
 * Closes a Safari tab, either a specific tab identified by window ID and tab index,
 * or the currently focused tab if no specific tab is provided.
 * Closes exactly the tab that was confirmed, and fails without closing anything if it moved or changed page.
 * Returns the title and URL of the closed tab.
 */
export default async function tool(input: Input) {
  const tab = (await takeConfirmedTab(input)) ?? (await resolveTab(input.tab));
  return await closePinnedTab(tab);
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  // A missing tab skips the confirmation; the tool then fails and closes nothing
  const tab = await resolveTab(input.tab).catch(() => undefined);
  if (!tab) return undefined;

  const confirmed: ConfirmedTab = { target: targetKey(input), tab, confirmedAt: Date.now() };
  await LocalStorage.setItem(CONFIRMED_TAB_KEY, JSON.stringify(confirmed));

  return {
    style: Action.Style.Destructive,
    message: "Close this tab?",
    info: [
      { name: "Title", value: tab.title },
      { name: "URL", value: tab.url },
    ],
  };
};

async function takeConfirmedTab(input: Input): Promise<PinnedTab | undefined> {
  const stored = await LocalStorage.getItem<string>(CONFIRMED_TAB_KEY);
  await LocalStorage.removeItem(CONFIRMED_TAB_KEY);
  if (!stored) return undefined;
  try {
    const confirmed = JSON.parse(stored) as ConfirmedTab;
    const isFresh = Date.now() - confirmed.confirmedAt < CONFIRMED_TAB_MAX_AGE_MS;
    return isFresh && confirmed.target === targetKey(input) ? confirmed.tab : undefined;
  } catch {
    return undefined;
  }
}
