import { getUsageHistory } from "../helpers/apps";
import { getAppByValue } from "../helpers/custom-app-utils";
import { formatRelativeDate } from "../utils/date";
import { safeAsyncOperation } from "../utils/errors";

/**
 * Arguments for the history tool
 */
interface HistoryToolArgs {
  /** Optional app filter - only show profiles opened on this app */
  app?: string;
  /** Maximum number of history items to return (default: 10) */
  limit?: number;
}

/**
 * Get recently opened profiles, optionally filtered by app
 * @param args - Optional arguments for filtering and limiting results
 * @param args.app - Filter results to only show profiles opened on this app
 * @param args.limit - Maximum number of results to return (default: 10)
 * @returns Promise<string> Formatted string of recent profile history
 */
export default async function getProfileHistory(args: HistoryToolArgs = {}): Promise<string> {
  const { app, limit = 10 } = args;

  const result = await safeAsyncOperation(
    async () => {
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
      const historyLines = await Promise.all(
        sortedHistory.map(async (item) => {
          const appInfo = await getAppByValue(item.app);
          const appName = appInfo?.name || item.appName;
          const timeAgo = formatRelativeDate(item.timestamp);
          return `• ${item.profile} on ${appName} (${timeAgo})`;
        }),
      );

      const headerText = app ? `Recently opened profiles on ${app}:` : "Recently opened profiles:";

      return `${headerText}\n\n${historyLines.join("\n")}`;
    },
    "Get profile history",
    { showToastOnError: false, fallbackValue: "Unable to retrieve profile history at this time." },
  );

  return result || "Unable to retrieve profile history at this time.";
}
