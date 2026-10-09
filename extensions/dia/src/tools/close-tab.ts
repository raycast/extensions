import { Action, Tool } from "@raycast/api";
import { closeTab } from "../dia";
import { findTab, toAutomationError, type TabTarget } from "../find-tab";

/**
 * Closes an open Dia tab, or the focused tab when no tab is specified.
 */
export default async function tool(input: TabTarget) {
  const tab = await findTab(input);
  await closeTab(tab).catch((error) => {
    throw toAutomationError(error);
  });
  return { closedTab: { title: tab.title, url: tab.url } };
}

export const confirmation: Tool.Confirmation<TabTarget> = async (input) => {
  // An ambiguous or missing tab skips the confirmation; the tool then fails with the candidates and closes nothing
  const tab = await findTab(input).catch(() => undefined);
  if (!tab) return undefined;

  return {
    style: Action.Style.Destructive,
    message: "Close this tab?",
    info: [
      { name: "Title", value: tab.title },
      { name: "URL", value: tab.url ?? "" },
    ],
  };
};
