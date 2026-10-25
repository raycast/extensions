import { selectTab } from "../yab";

type Input = {
  /** The tab's id, from get-tabs or get-focused-tab. */
  tabId: string;
};

/** Bring a tab to the front, going to its space if it is in another. */
export default async function tool(input: Input) {
  await selectTab(input.tabId);
  return "Done";
}
