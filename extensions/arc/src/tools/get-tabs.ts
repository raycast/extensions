import { getTabs, getTabsInSpace } from "../arc";
import { TabLocation } from "../types";

type Input = {
  /**
   * The space ID to get the tabs from.
   *
   * @remarks
   * Use the `get-spaces` or `get-active-space` tool to get the space ID. If space is not specified, omit it. If no spaceId is provided, the tabs from all spaces will be returned.
   */
  spaceId?: string;

  /**
   * The location of the tabs to get.
   *
   * @remarks
   * If not specified, all tabs will be returned.
   */
  tabLocation?: TabLocation;
};

const tool = async (input: Input) => {
  const tabs = input.spaceId ? await getTabsInSpace(input.spaceId) : await getTabs();
  return input.tabLocation ? tabs?.filter((tab) => tab.location === input.tabLocation) : tabs;
};

export default tool;
