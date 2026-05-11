import {
  getUsageHistory,
  getStarredUsageHistory,
  toggleStarredHistoryItem,
  isHistoryItemStarred,
  getAllApps,
} from "../helpers/apps";
import { getAppByValue } from "../helpers/custom-app-utils";
import { formatRelativeDate } from "../utils/date";
import { safeAsyncOperation } from "../utils/errors";

/**
 * Arguments for the history tool
 */
interface HistoryToolArgs {
  /** Action to perform: list history, star/unstar a pair, or list starred items */
  action?: "list" | "star" | "unstar" | "list_starred";
  /** Optional profile for star/unstar actions */
  profile?: string;
  /** Optional app filter - only show profiles opened on this app */
  app?: string;
  /** Maximum number of history items to return (default: 10) */
  limit?: number;
}

async function resolveAppValue(inputApp: string): Promise<{ value: string; name: string } | null> {
  const allApps = await getAllApps();
  const normalizedInput = inputApp.trim().toLowerCase();

  const match = allApps.find(
    (item) => item.value.toLowerCase() === normalizedInput || item.name.toLowerCase() === normalizedInput,
  );
  return match ? { value: match.value, name: match.name } : null;
}

async function formatHistoryLines(
  items: { profile: string; app: string; appName: string; timestamp: number }[],
): Promise<string[]> {
  return Promise.all(
    items.map(async (item) => {
      const appInfo = await getAppByValue(item.app);
      const appName = appInfo?.name || item.appName;
      const timeAgo = formatRelativeDate(item.timestamp);
      return `• ${item.profile} on ${appName} (${timeAgo})`;
    }),
  );
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

  const result = await safeAsyncOperation(
    async () => {
      if (action === "star" || action === "unstar") {
        if (!profile || !app) {
          return "To star or unstar, provide both profile and app.";
        }

        const resolvedApp = await resolveAppValue(app);
        if (!resolvedApp) {
          return `App "${app}" is not available.`;
        }

        const normalizedProfile = profile.startsWith("@") ? profile.slice(1) : profile;
        const isStarred = await isHistoryItemStarred(normalizedProfile, resolvedApp.value);
        const label = `@${normalizedProfile} on ${resolvedApp.name}`;

        if (action === "star" && isStarred) {
          return `${label} is already starred.`;
        }
        if (action === "unstar" && !isStarred) {
          return `${label} is not currently starred.`;
        }

        await toggleStarredHistoryItem(normalizedProfile, resolvedApp.value);
        return action === "star" ? `Starred ${label}.` : `Unstarred ${label}.`;
      }

      if (action === "list_starred") {
        const starredHistory = await getStarredUsageHistory(app, limit);

        if (starredHistory.length === 0) {
          return app ? `No starred profiles found on ${app}.` : "No starred profiles found.";
        }

        const historyLines = await formatHistoryLines(starredHistory);
        const headerText = app ? `Starred profiles on ${app}:` : "Starred profiles:";
        return `${headerText}\n\n${historyLines.join("\n")}`;
      }

      // Get all usage history
      const usageHistory = await getUsageHistory();

      if (usageHistory.length === 0) {
        return "No profile history found.";
      }

      // Filter by app if specified
      let filteredHistory = usageHistory;
      if (app) {
        const appLower = app.toLowerCase();
        filteredHistory = usageHistory.filter(
          (item) => item.app.toLowerCase() === appLower || item.appName.toLowerCase().includes(appLower),
        );

        if (filteredHistory.length === 0) {
          return `No profiles were recently opened on ${app}.`;
        }
      }

      // Sort by timestamp (most recent first) and limit results
      const sortedHistory = filteredHistory.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);

      // Format the response
      const historyLines = await formatHistoryLines(sortedHistory);

      const headerText = app ? `Recently opened profiles on ${app}:` : "Recently opened profiles:";

      return `${headerText}\n\n${historyLines.join("\n")}`;
    },
    "Get profile history",
    { showToastOnError: false, fallbackValue: "Unable to retrieve profile history at this time." },
  );

  return result || "Unable to retrieve profile history at this time.";
}
