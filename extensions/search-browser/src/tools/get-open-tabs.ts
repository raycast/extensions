import { getOpenTabsWithFallback } from "../lib/browser";
import { matchesQuery } from "../lib/utils";

type Input = {
  /** Optional search terms to filter open tabs by title, URL, or space. */
  query?: string;
  /** Maximum number of tabs to return (default: 50, max: 200). */
  limit?: number;
};

export default async function tool(input: Input = {}) {
  const { tabs, isRunning, permissionDenied } = await getOpenTabsWithFallback();
  const query = input.query?.trim() ?? "";
  const limit = Math.min(Math.max(input.limit ?? 50, 1), 200);

  const filtered = tabs
    .filter((tab) => matchesQuery(query, tab.title, tab.url, tab.space, tab.profile))
    .slice(0, limit);

  return {
    isRunning,
    permissionDenied,
    count: filtered.length,
    tabs: filtered.map((tab) => ({
      title: tab.title,
      url: tab.url,
      windowId: tab.windowId,
      space: tab.space,
      profile: tab.profile,
      isActive: tab.isActive,
      source: tab.source,
    })),
  };
}
