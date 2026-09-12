import { selectTab } from "../arc";

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
  selectTab(input.tabId);
};

export default tool;
