import { findVisibleApp, getAppEntries } from "../helpers/apps";
import {
  describeOpens,
  filterHistoryByApp,
  getHistory,
  getStarredHistory,
  setHistoryItemStarred,
} from "../helpers/history";
import { cleanProfile } from "../helpers/url";
import { UsageHistoryItem } from "../types";
import { formatRelativeDate } from "../utils/date";

/**
 * Arguments for the history tool
 */
type HistoryToolArgs = {
  /** Action to perform: list history, add a pair to Favorites (star), remove it (unstar), or list Favorites (list_starred) */
  action?: "list" | "star" | "unstar" | "list_starred";
  /** Profile, required to add to or remove from Favorites */
  profile?: string;
  /** Optional app filter - only show profiles opened on this app */
  app?: string;
  /** Maximum number of history items to return (default: 10) */
  limit?: number;
};

async function formatHistoryLines(items: UsageHistoryItem[]): Promise<string[]> {
  const names = new Map((await getAppEntries()).map((entry) => [entry.value, entry.name]));
  return items.map((item) => {
    return `• ${item.profile} on ${names.get(item.app) ?? item.appName} (opened ${describeOpens(item.count)}, last ${formatRelativeDate(item.timestamp)})`;
  });
}

/**
 * Get recently opened profiles, optionally filtered by app
 * @param args - Optional arguments for filtering and limiting results
 * @param args.app - Filter results to only show profiles opened on this app
 * @param args.limit - Maximum number of results to return (default: 10)
 * @returns Promise<string> Formatted string of recent profile history
 */
export default async function getProfileHistory(args: HistoryToolArgs = {}): Promise<string> {
  const { action = "list", profile, app, limit = 10 } = args;

  if (action === "star" || action === "unstar") {
    if (!profile || !app) {
      return "To add to or remove from Favorites, provide both profile and app.";
    }

    const resolvedApp = await findVisibleApp(app);
    if (!resolvedApp) {
      return `App "${app}" is not available.`;
    }

    const normalizedProfile = cleanProfile(profile);
    const label = `@${normalizedProfile} on ${resolvedApp.name}`;
    const changed = await setHistoryItemStarred(normalizedProfile, resolvedApp.value, action === "star");
    if (!changed) {
      return action === "star" ? `${label} is already in Favorites.` : `${label} isn't in Favorites.`;
    }
    return action === "star" ? `Added ${label} to Favorites.` : `Removed ${label} from Favorites.`;
  }

  if (action === "list_starred") {
    const starredHistory = await getStarredHistory(app, limit);

    if (starredHistory.length === 0) {
      return app ? `No favorites found on ${app}.` : "No favorites found.";
    }

    const historyLines = await formatHistoryLines(starredHistory);
    const headerText = app ? `Favorites on ${app}:` : "Favorites:";
    return `${headerText}\n\n${historyLines.join("\n")}`;
  }

  const history = await getHistory();
  if (history.length === 0) {
    return "No profile history found.";
  }

  const filteredHistory = filterHistoryByApp(history, app);
  if (filteredHistory.length === 0) {
    return `No profiles were recently opened on ${app}.`;
  }

  const historyLines = await formatHistoryLines(filteredHistory.slice(0, limit));
  const headerText = app ? `Recently opened profiles on ${app}:` : "Recently opened profiles:";
  return `${headerText}\n\n${historyLines.join("\n")}`;
}
