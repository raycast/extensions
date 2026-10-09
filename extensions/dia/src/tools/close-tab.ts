import { Action, Tool } from "@raycast/api";
import { closeTab } from "../dia";
import { findTab, toAutomationError, type TabTarget } from "../find-tab";

/**
 * Closes the Dia tab with the given tabId.
 *
 * Without a tabId, nothing is closed: the tool resolves the tab from the query (or the focused tab) and returns it,
 * so it can be confirmed and closed by calling this tool again with its tabId.
 */
export default async function tool(input: TabTarget) {
  if (!input.tabId) {
    const tab = await findTab(input);
    return {
      closed: false,
      candidate: { tabId: tab.tabId, title: tab.title, url: tab.url },
      message: "Nothing was closed. Call close-tab again with this candidate's tabId to close it.",
    };
  }

  // Look the tab up by ID only, so the tab closed is the one shown in the confirmation
  const tab = await findTab({ tabId: input.tabId });
  await closeTab(tab).catch((error) => {
    throw toAutomationError(error);
  });
  return { closed: true, closedTab: { tabId: tab.tabId, title: tab.title, url: tab.url } };
}

export const confirmation: Tool.Confirmation<TabTarget> = async (input) => {
  // Nothing is closed without a tabId, so there is nothing to confirm
  if (!input.tabId) return undefined;

  // Throw rather than skip the dialog: if the tab can't be shown, it must not be closed
  const tab = await findTab({ tabId: input.tabId }).catch(() => {
    throw new Error(`Couldn't confirm closing the tab with ID "${input.tabId}": it isn't open. Nothing was closed.`);
  });

  return {
    style: Action.Style.Destructive,
    message: "Close this tab?",
    info: [
      { name: "Title", value: tab.title },
      { name: "URL", value: tab.url ?? "" },
    ],
  };
};
