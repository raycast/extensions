import { Tool } from "@raycast/api";
import { closeTab, getTabs } from "../cra";

type Input = {
  /**
   * The ID of the tab to close.
   *
   * @remarks
   * Use `get-tabs` to get the ID of a tab.
   */
  tabId: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const tab = (await getTabs())?.find((tab) => tab.id === input.tabId);
  return {
    message: `Close the tab "${tab?.title || input.tabId}"?`,
    info: tab ? [{ name: "URL", value: tab.url }] : [],
  };
};

const tool = async (input: Input) => {
  const tabs = await getTabs();
  if (!tabs?.some((tab) => tab.id === input.tabId)) {
    throw new Error(
      `No tab with ID "${input.tabId}" found in the front Cra window. Use get-tabs to list the open tabs.`,
    );
  }

  await closeTab(input.tabId);
};

export default tool;
