import { closeTab } from "../arc";

type Input = {
  /**
   * The ID of the tab to close.
   *
   * @remarks
   * Use `get-tabs` to get the ID of a tab.
   */
  tabId: string;
};

const tool = async (input: Input) => {
  closeTab(input.tabId);
};

export default tool;
