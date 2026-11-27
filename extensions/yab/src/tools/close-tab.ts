import { Tool } from "@raycast/api";
import { closeTab, readWindow } from "../yab";

type Input = {
  /** The ids of the tabs to close, from get-tabs. Only tabs the user asked to close. */
  tabIds: string[];
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tabs = (await readWindow())?.tabs ?? [];
  const named = input.tabIds.map((id) => tabs.find((t) => t.id === id));
  return {
    message: `Close ${input.tabIds.length === 1 ? "this tab" : `these ${input.tabIds.length} tabs`}?`,
    info: named.filter(Boolean).map((t) => ({ name: t!.spaceTitle, value: t!.title || t!.url })),
  };
};

/** Close open tabs in Yab. */
export default async function tool(input: Input) {
  const tabs = (await readWindow())?.tabs ?? [];
  const missing = input.tabIds.filter((id) => !tabs.some((t) => t.id === id));
  for (const id of input.tabIds.filter((id) => !missing.includes(id))) await closeTab(id);
  return missing.length ? `Closed ${input.tabIds.length - missing.length}; ${missing.length} no longer open` : "Closed";
}
