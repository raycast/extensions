import type { CopilotInternalUserResponse, CopilotUsage, QuotaSnapshot } from "../services/copilot";

/**
 * Calculates the consumed percentage from a quota snapshot
 * Uses percent_remaining directly from the API
 * @returns Percentage consumed (0-100), capped at 100%
 */
const getConsumedPercentage = (snapshot: QuotaSnapshot | undefined): number => {
  if (!snapshot || snapshot.unlimited) return 0;

  if (snapshot.percent_remaining !== undefined) {
    return Math.min(100, 100 - snapshot.percent_remaining);
  }

  return 0;
};

/**
 * Parses the internal Copilot usage response to extract usage data.
 * @param response The internal Copilot usage response
 * @returns The parsed Copilot usage data
 */
export const parseUsageData = (response: CopilotInternalUserResponse): CopilotUsage => {
  const snapshots = response.quota_snapshots;

  // Extract completions (code completions)
  const completionsSnapshot = snapshots.completions;
  const inlineSuggestionsLimit = completionsSnapshot?.unlimited ? null : (completionsSnapshot?.entitlement ?? 0);
  const inlineSuggestionsCurrent = getConsumedPercentage(completionsSnapshot);

  // Extract chat messages
  const chatSnapshot = snapshots.chat;
  const chatMessagesLimit = chatSnapshot?.unlimited ? null : (chatSnapshot?.entitlement ?? 0);
  const chatMessagesCurrent = getConsumedPercentage(chatSnapshot);

  // Extract premium interactions (premium requests)
  const premiumSnapshot = snapshots.premium_interactions;
  const premiumRequestsLimit = premiumSnapshot?.unlimited ? null : (premiumSnapshot?.entitlement ?? 0);
  const premiumRequestsCurrent = getConsumedPercentage(premiumSnapshot);

  return {
    inlineSuggestions: {
      percentageUsed: inlineSuggestionsCurrent,
      limit: inlineSuggestionsLimit,
    },
    chatMessages: {
      percentageUsed: chatMessagesCurrent,
      limit: chatMessagesLimit,
    },
    premiumRequests: {
      percentageUsed: premiumRequestsCurrent,
      limit: premiumRequestsLimit,
    },
    allowanceResetAt: response.quota_reset_date_utc,
  };
};
