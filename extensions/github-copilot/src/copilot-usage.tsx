import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";
import { withAccessToken } from "@raycast/utils";
import { useCopilotUsage } from "./hooks/useCopilotUsage";
import { provider, reauthorize } from "./lib/oauth";

function Command() {
  const { isLoading, usage, error, revalidate } = useCopilotUsage();

  const formatUsage = (percentageUsed: number, limit: number | null): string => {
    if (limit === null) {
      return "Unlimited";
    }
    return `${percentageUsed.toFixed(1)}%`;
  };

  const getProgressColor = (percentageUsed: number, limit: number | null): Color => {
    if (limit === null) {
      return Color.Green;
    }
    if (percentageUsed >= 90) {
      return Color.Red;
    } else if (percentageUsed >= 70) {
      return Color.Orange;
    }
    return Color.Blue;
  };

  const formatResetDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const UsageActions = (
    <ActionPanel>
      <Action.OpenInBrowser title="Manage Paid Premium Requests" url="https://github.com/settings/billing/budgets" />
      <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />
      {/* eslint-disable-next-line @raycast/prefer-title-case */}
      <Action title="Log Out" icon={Icon.Logout} onAction={reauthorize} />
    </ActionPanel>
  );

  if (!usage && !isLoading) {
    return (
      <List>
        <List.EmptyView
          icon={{ source: "copilot.svg", tintColor: Color.PrimaryText }}
          title="Usage Data Not Available"
          description={error ? error.message : "Failed to fetch usage data. Please check your connection."}
          actions={UsageActions}
        />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {usage && (
        <>
          <List.Section title="Copilot Usage">
            <List.Item
              title="Code completions"
              accessories={[
                {
                  text: formatUsage(usage.inlineSuggestions.percentageUsed, usage.inlineSuggestions.limit),
                  icon: {
                    source: Icon.BarChart,
                    tintColor: getProgressColor(usage.inlineSuggestions.percentageUsed, usage.inlineSuggestions.limit),
                  },
                },
              ]}
              icon={{ source: Icon.Code, tintColor: Color.PrimaryText }}
              actions={UsageActions}
            />
            <List.Item
              title="Chat messages"
              accessories={[
                {
                  text: formatUsage(usage.chatMessages.percentageUsed, usage.chatMessages.limit),
                  icon: {
                    source: Icon.BarChart,
                    tintColor: getProgressColor(usage.chatMessages.percentageUsed, usage.chatMessages.limit),
                  },
                },
              ]}
              icon={{ source: Icon.Message, tintColor: Color.PrimaryText }}
              actions={UsageActions}
            />
            <List.Item
              title="Premium requests"
              accessories={[
                {
                  text: formatUsage(usage.premiumRequests.percentageUsed, usage.premiumRequests.limit),
                  icon: {
                    source: Icon.BarChart,
                    tintColor: getProgressColor(usage.premiumRequests.percentageUsed, usage.premiumRequests.limit),
                  },
                },
              ]}
              icon={{ source: Icon.Star, tintColor: Color.PrimaryText }}
              actions={UsageActions}
            />
          </List.Section>

          {usage.allowanceResetAt && (
            <List.Section title="">
              <List.Item
                title="Additional paid premium requests enabled."
                icon={{ source: Icon.Info, tintColor: Color.SecondaryText }}
                actions={UsageActions}
              />
              <List.Item
                title={`Allowance resets ${formatResetDate(usage.allowanceResetAt)}.`}
                icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
                actions={UsageActions}
              />
            </List.Section>
          )}
        </>
      )}
    </List>
  );
}

export default withAccessToken(provider)(Command);
