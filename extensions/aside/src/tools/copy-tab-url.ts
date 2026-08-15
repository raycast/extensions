import { Clipboard } from "@raycast/api";
import { getTabUrl } from "../lib/browser";
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
  const result = await getTabUrl(toTabTarget(input));
  if (!result.url) throw new Error("The selected tab does not have a URL to copy.");
  await Clipboard.copy(result.url);
  return { ...result, copied: true };
}
