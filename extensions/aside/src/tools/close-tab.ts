import { Action, Tool } from "@raycast/api";
import { closeAsideTabById, getAsideTabSnapshot } from "../lib/applescript";
import { requireNonEmpty } from "../lib/tool-input";

type Input = {
  /** Current session-scoped Aside tab ID from `get-tabs` or `get-active-tab`. Use the exact ID and never infer it. */
  tabId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tabId = requireNonEmpty(input.tabId, "Tab ID");
  const { tabs } = await getAsideTabSnapshot();
  const tab = tabs.find((candidate) => candidate.id === tabId);
  if (!tab) return undefined;
  return {
    style: Action.Style.Destructive,
    message: "Close this Aside tab?",
    info: [
      { name: "Title", value: tab.title || "Untitled" },
      { name: "URL", value: tab.url || "No URL" },
      { name: "Tab ID", value: tab.id },
    ],
  };
};

/** Close an exact live Aside tab using an ID returned by `get-tabs` or `get-active-tab`. */
export default async function tool(input: Input) {
  const tabId = requireNonEmpty(input.tabId, "Tab ID");
  return { tabId, status: await closeAsideTabById(tabId) };
}
