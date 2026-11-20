import { getTabs, selectTab } from "../arc";

type Input = {
  /**
   * The ID of the tab to select.
   *
   * @remarks
   * Use `get-tabs` to get the ID of a tab.
   */
  tabId: string;
};

const tool = async (input: Input) => {
  const tabs = await getTabs();
  if (!tabs?.some((tab) => tab.id === input.tabId)) {
    throw new Error(
      `No tab with ID "${input.tabId}" found in the front Arc window. Use get-tabs to list the open tabs.`,
    );
  }

  await selectTab(input.tabId);
};

export default tool;
