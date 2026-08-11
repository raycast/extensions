import { List, getPreferenceValues, Icon, Color } from "@raycast/api";
import { useFetch } from "@raycast/utils";

interface UsageDetail {
  limit: string;
  used?: string;
  remaining: string;
  resetTime: string;
}

interface RateLimit {
  window: {
    duration: number;
    timeUnit: string;
  };
  detail: UsageDetail;
}

interface UsageResponse {
  user: {
    userId: string;
    region: string;
    membership: {
      level: string;
    };
    businessId: string;
  };
  usage: UsageDetail;
  limits: RateLimit[];
}

function formatResetTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

function formatRegion(region: string): string {
  return region.replace("REGION_", "");
}

function formatMembership(level: string): string {
  return level.replace("LEVEL_", "");
}

function formatTimeUnit(timeUnit: string): string {
  switch (timeUnit) {
    case "TIME_UNIT_SECOND":
      return "seconds";
    case "TIME_UNIT_MINUTE":
      return "minutes";
    case "TIME_UNIT_HOUR":
      return "hours";
    case "TIME_UNIT_DAY":
      return "days";
    default:
      return timeUnit.replace("TIME_UNIT_", "").toLowerCase();
  }
}

function getUsageColor(used: number, limit: number): Color {
  const ratio = used / limit;
  if (ratio >= 0.9) return Color.Red;
  if (ratio >= 0.7) return Color.Orange;
  return Color.Green;
}

export default function Command() {
  const { apiKey } = getPreferenceValues<Preferences>();

  const { isLoading, data, error } = useFetch<UsageResponse>("https://api.kimi.com/coding/v1/usages", {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
  });

  if (error) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Failed to fetch usage" description={error.message} />
      </List>
    );
  }

  const usage = data?.usage;
  const user = data?.user;
  const limits = data?.limits ?? [];

  return (
    <List isLoading={isLoading}>
      {user && (
        <List.Section title="User">
          <List.Item icon={Icon.Person} title="User ID" accessories={[{ text: user.userId }]} />
          <List.Item icon={Icon.Globe} title="Region" accessories={[{ text: formatRegion(user.region) }]} />
          <List.Item
            icon={Icon.Star}
            title="Membership"
            accessories={[{ text: formatMembership(user.membership.level) }]}
          />
          {user.businessId && (
            <List.Item icon={Icon.Building} title="Business ID" accessories={[{ text: user.businessId }]} />
          )}
        </List.Section>
      )}

      {usage && (
        <List.Section title="Weekly Usage">
          <List.Item
            icon={Icon.BarChart}
            title="Usage"
            accessories={[
              {
                tag: {
                  value: `${usage.used ?? "0"}%`,
                  color: getUsageColor(parseInt(usage.used ?? "0"), parseInt(usage.limit)),
                },
              },
              { text: `${usage.remaining ?? "0"}% remaining` },
            ]}
          />
          <List.Item icon={Icon.Clock} title="Resets At" accessories={[{ text: formatResetTime(usage.resetTime) }]} />
        </List.Section>
      )}

      {limits.map((limit, index) => (
        <List.Section
          key={index}
          title={`Rate Limit (${limit.window.duration} ${formatTimeUnit(limit.window.timeUnit)})`}
        >
          <List.Item
            icon={Icon.BarChart}
            title="Rate Limit Details"
            accessories={[
              {
                tag: {
                  value: `${limit.detail.used ?? "0"}%`,
                  color: getUsageColor(parseInt(limit.detail.used ?? "0"), parseInt(limit.detail.limit)),
                },
              },
              { text: `${limit.detail.remaining ?? "0"}% remaining` },
            ]}
          />
          <List.Item
            icon={Icon.Clock}
            title="Resets At"
            accessories={[{ text: formatResetTime(limit.detail.resetTime) }]}
          />
        </List.Section>
      ))}
    </List>
  );
}
