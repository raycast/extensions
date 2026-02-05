import { List, Icon, showToast, Toast, getPreferenceValues } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import fetch from "node-fetch";

interface CopilotUsageData {
  plan: string;
  quotas: {
    limits: {
      premiumInteractions: number;
    };
    remaining: {
      // Free plan has these additional fields
      chat?: number;
      completions?: number;
      // Fields available in all plans
      premiumInteractions: number;
      chatPercentage: number;
      premiumInteractionsPercentage: number;
    };
    resetDate: string;
    overagesEnabled?: boolean;
  };
}

const EMBEDDED_DATA_REGEX = /<script type="application\/json" data-target="react-partial.embeddedData">(.+?)<\/script>/;
const FULL_PERCENTAGE = 100;

export default function CopilotUsage() {
  const { copilotUserSession } = getPreferenceValues<Preferences.CopilotUsage>();

  const { data, isLoading, error } = useCachedPromise(
    async (session: string) => {
      const response = await fetch("https://github.com/github-copilot/chat", {
        headers: {
          Cookie: `user_session=${session}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`);
      }

      const text = await response.text();
      const match = text.match(EMBEDDED_DATA_REGEX);

      if (!match?.[1]) {
        throw new Error("Failed to parse Copilot usage data from HTML");
      }

      const json = JSON.parse(match[1]);
      return json.props as CopilotUsageData;
    },
    [copilotUserSession],
    {
      onError(error) {
        showToast({
          style: Toast.Style.Failure,
          title: "Failed to fetch Copilot usage",
          message: error.message,
        });
      },
    },
  );

  if (error) {
    return (
      <List>
        <List.EmptyView
          icon={Icon.Warning}
          title="Error"
          description={`Failed to load data. Please ensure your token is valid for this operation.\n${error.message}`}
        />
      </List>
    );
  }

  // Determine if this is a Free Plan
  const isFree = data?.plan.toLowerCase() === "free";
  const remaining = data?.quotas.remaining;

  // Premium Requests calculations
  const premiumUsed = data && remaining ? data.quotas.limits.premiumInteractions - remaining.premiumInteractions : 0;
  const premiumTotal = data?.quotas.limits.premiumInteractions ?? 0;
  const premiumUsedPercentage =
    data && remaining ? (FULL_PERCENTAGE - remaining.premiumInteractionsPercentage).toFixed(1) : "0";

  // Chat calculations (Free Plan shows count, Paid Plan shows rate limit percentage)
  const chatUsedPercentage = data && remaining ? (FULL_PERCENTAGE - remaining.chatPercentage).toFixed(1) : "0";
  const chatRemaining = remaining?.chat ?? 0;

  // Completions (Free Plan only)
  const completionsRemaining = remaining?.completions ?? 0;

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search usage details...">
      {data && (
        <>
          <List.Section title="Plan Details">
            <List.Item icon={Icon.CreditCard} title="Plan" subtitle={data.plan.toUpperCase()} />
          </List.Section>

          <List.Section title="Usage & Limits">
            {/* Premium Requests */}
            <List.Item
              icon={Icon.Stars}
              title="Premium Requests"
              subtitle={premiumTotal > 0 ? `${premiumUsed} / ${premiumTotal}` : "Not available"}
              accessories={
                premiumTotal > 0 ? [{ text: `${premiumUsedPercentage}% used`, tooltip: "Used Percentage" }] : []
              }
            />

            {/* Chat - Free Plan shows count, Paid Plan shows rate limit */}
            <List.Item
              icon={Icon.Message}
              title="Chat"
              subtitle={isFree ? `${chatRemaining} remaining` : `${chatUsedPercentage}% rate limit used`}
              accessories={
                isFree
                  ? [{ text: `${chatUsedPercentage}% used`, tooltip: "Usage Percentage" }]
                  : [{ text: "Unlimited", tooltip: "No usage limit, only rate limiting applies" }]
              }
            />

            {/* Completions - Free Plan only */}
            {isFree && (
              <List.Item
                icon={Icon.Code}
                title="Code Completions"
                subtitle={`${completionsRemaining} remaining`}
                accessories={[{ text: "Inline suggestions", tooltip: "Code completion suggestions" }]}
              />
            )}

            <List.Item icon={Icon.Clock} title="Reset Date" subtitle={formatResetDate(data.quotas.resetDate)} />
          </List.Section>
        </>
      )}
    </List>
  );
}

function formatResetDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}
