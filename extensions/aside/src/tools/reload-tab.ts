import { reloadTab } from "../lib/browser";
import { toTabTarget } from "../lib/tool-utils";

type Input = {
  /** Native tab ID returned by Get Tabs or Get Active Tab. */
  tabId: string;
  /** Native window ID returned alongside the tab ID. */
  windowId: string;
  /** Optional human-readable title for context. */
  title?: string;
};

export default async function tool(input: Input) {
  return reloadTab(toTabTarget(input));
}
