import { clampLimit } from "../lib/tool-input";
import { filterLiveTabs, getLiveTabSnapshot } from "../lib/tabs";

type Input = {
  /** Optional multiword search over tab titles and URLs. Every word must match either the title or URL. */
  query?: string;
  /** Filter tabs by pinned state. Omit or use "all" to include pinned and unpinned tabs. */
  pinned?: "all" | "pinned" | "unpinned";
  /** Search every Aside window or only the frontmost window. Defaults to "all". */
  windowScope?: "all" | "frontmost";
  /** Maximum matching tabs to return. Defaults to 25 and is clamped from 1 through 100. */
  limit?: number;
};

/** Find live Aside tabs and return current session-scoped IDs with browser metadata. */
export default async function tool(input: Input) {
  const limit = clampLimit(input.limit, 25, 100);
  const snapshot = await getLiveTabSnapshot();
  let matches = filterLiveTabs(snapshot.tabs, input.query);
  if (input.pinned === "pinned") matches = matches.filter((tab) => tab.isPinned);
  if (input.pinned === "unpinned") matches = matches.filter((tab) => !tab.isPinned);
  if (input.windowScope === "frontmost") matches = matches.filter((tab) => tab.windowIndex === 1);

  const tabs = matches.slice(0, limit);
  return {
    browserStatus: snapshot.browserStatus,
    totalMatches: matches.length,
    returned: tabs.length,
    truncated: tabs.length < matches.length,
    tabs,
  };
}
