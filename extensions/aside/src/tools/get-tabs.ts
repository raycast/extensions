import { listTabs } from "../lib/browser";
import { clampLimit, filterTabs } from "../lib/tool-utils";

type Input = {
  /** Words that must appear in the tab title or URL. Omit to return all tabs. */
  query?: string;
  /** Limit results to normal or incognito windows. */
  windowMode?: "normal" | "incognito";
  /** Return only active tabs. There can be one active tab per window. */
  activeOnly?: boolean;
  /** Maximum number of tabs to return, from 1 to 100. Defaults to 25. Use the smallest practical value. */
  limit?: number;
};

export default async function tool(input: Input) {
  let tabs = filterTabs(await listTabs(), input.query);
  if (input.windowMode) tabs = tabs.filter((tab) => tab.windowMode === input.windowMode);
  if (input.activeOnly) tabs = tabs.filter((tab) => tab.active);
  return tabs.slice(0, clampLimit(input.limit, 25));
}
