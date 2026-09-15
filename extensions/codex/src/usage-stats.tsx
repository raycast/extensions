import { Action, ActionPanel, Color, Icon, Keyboard, List } from "@raycast/api";
import { usePromise } from "@raycast/utils";
import {
  type CodexRateLimit,
  type CodexRateLimitWindow,
  type CodexUsage,
  readCodexUsage,
} from "./utils/app-server";
import { formatCompactTokens } from "./utils/format";
import { openCodexApp } from "./utils/launch";
import { revalidateWithToast } from "./utils/raycast";
import { calculateRecentTokenUsage } from "./utils/token-usage";

type RateLimitRow = {
  id: string;
  title: string;
  window: CodexRateLimitWindow;
  isSpark: boolean;
};

export default function UsageStatsCommand() {
  const usageState = usePromise(readCodexUsage, [], {
    failureToastOptions: { title: "Couldn't load Codex usage" },
  });
  const data = usageState.data;

  return (
    <List
      isLoading={usageState.isLoading}
      filtering={{ keepSectionOrder: true }}
      searchBarPlaceholder="Search Codex usage"
    >
      {data ? (
        <>
          <RateLimitsSection data={data} onRefresh={usageState.revalidate} />
          <ResetsSection data={data} onRefresh={usageState.revalidate} />
          <UsageSection data={data} onRefresh={usageState.revalidate} />
        </>
      ) : null}

      {!usageState.isLoading && usageState.error && !data ? (
        <List.EmptyView
          title="Couldn't Load Usage Stats"
          description={usageState.error.message}
          icon={Icon.Warning}
          actions={<UsageActions onRefresh={usageState.revalidate} />}
        />
      ) : null}
    </List>
  );
}

function RateLimitsSection({
  data,
  onRefresh,
}: {
  data: CodexUsage;
  onRefresh: () => Promise<CodexUsage | undefined>;
}) {
  const rows = buildRateLimitRows(data);

  return (
    <List.Section title="Rate Limits" subtitle={getPlanName(data)}>
      {rows.map((row) => {
        const remaining = Math.max(
          0,
          Math.min(100, Math.round(100 - row.window.usedPercent)),
        );
        const color = row.isSpark
          ? Color.SecondaryText
          : getRemainingColor(remaining);

        return (
          <List.Item
            key={row.id}
            id={row.id}
            title={row.title}
            subtitle={formatWindowDuration(row.window.windowDurationMins)}
            icon={{ source: getProgressIcon(remaining), tintColor: color }}
            accessories={[
              ...(row.window.resetsAt
                ? [{ text: `Resets ${formatResetDate(row.window.resetsAt)}` }]
                : []),
              { tag: { value: `${remaining}% remaining`, color } },
            ]}
            actions={<UsageActions onRefresh={onRefresh} />}
          />
        );
      })}
    </List.Section>
  );
}

function ResetsSection({
  data,
  onRefresh,
}: {
  data: CodexUsage;
  onRefresh: () => Promise<CodexUsage | undefined>;
}) {
  const resetCredits = data.rateLimits.rateLimitResetCredits;
  if (!resetCredits) return null;

  const availableCredit = resetCredits.credits?.find(
    (credit) => credit.status === "available",
  );
  const count = resetCredits.availableCount;

  return (
    <List.Section title="Resets">
      <List.Item
        id="reset-credits"
        title={availableCredit?.title ?? "Full Resets"}
        subtitle="Rate limit reset credit"
        icon={{
          source: Icon.ArrowCounterClockwise,
          tintColor: count > 0 ? Color.Green : Color.SecondaryText,
        }}
        accessories={[
          ...(availableCredit?.expiresAt
            ? [
                {
                  text: `Expires ${formatExpirationDate(availableCredit.expiresAt)}`,
                },
              ]
            : []),
          {
            tag: {
              value: `${count} available`,
              color: count > 0 ? Color.Green : Color.SecondaryText,
            },
          },
        ]}
        actions={<UsageActions onRefresh={onRefresh} />}
      />
    </List.Section>
  );
}

function UsageSection({
  data,
  onRefresh,
}: {
  data: CodexUsage;
  onRefresh: () => Promise<CodexUsage | undefined>;
}) {
  const buckets = data.tokenUsage.dailyUsageBuckets ?? [];
  const summary = data.tokenUsage.summary;
  const { todayTokens, lastSevenDaysTokens } =
    calculateRecentTokenUsage(buckets);

  const rows = [
    {
      id: "usage-today",
      title: "Today",
      value: formatTokens(todayTokens),
    },
    {
      id: "usage-week",
      title: "Last 7 Days",
      value: formatTokens(lastSevenDaysTokens),
    },
    {
      id: "usage-lifetime",
      title: "Lifetime",
      value: formatTokens(summary.lifetimeTokens),
    },
    {
      id: "usage-streak",
      title: "Current Streak",
      value:
        summary.currentStreakDays === null
          ? "Unavailable"
          : `${summary.currentStreakDays} ${summary.currentStreakDays === 1 ? "day" : "days"}`,
    },
  ];

  return (
    <List.Section title="Usage">
      {rows.map((row) => (
        <List.Item
          key={row.id}
          id={row.id}
          title={row.title}
          accessories={[{ text: row.value }]}
          actions={<UsageActions onRefresh={onRefresh} />}
        />
      ))}
    </List.Section>
  );
}

function UsageActions({
  onRefresh,
}: {
  onRefresh: () => Promise<CodexUsage | undefined>;
}) {
  return (
    <ActionPanel>
      <Action
        title="Refresh Usage"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={() =>
          revalidateWithToast(onRefresh, {
            successTitle: "Usage Refreshed",
            failureTitle: "Couldn't refresh Codex usage",
          })
        }
      />
      <ActionPanel.Section>
        <Action
          title="Open Codex"
          icon={Icon.AppWindow}
          shortcut={Keyboard.Shortcut.Common.Open}
          onAction={openCodexApp}
        />
      </ActionPanel.Section>
    </ActionPanel>
  );
}

function buildRateLimitRows(data: CodexUsage): RateLimitRow[] {
  const rateLimits = data.rateLimits.rateLimitsByLimitId;
  const entries: Array<[string, CodexRateLimit]> = rateLimits
    ? Object.entries(rateLimits).filter(
        (entry): entry is [string, CodexRateLimit] => Boolean(entry[1]),
      )
    : [
        [
          data.rateLimits.rateLimits.limitId ?? "codex",
          data.rateLimits.rateLimits,
        ],
      ];

  return entries
    .flatMap(([id, limit]) => {
      const title = limit.limitName ?? (id === "codex" ? "Codex" : id);
      const isSpark = /spark/i.test(id) || /spark/i.test(title);
      return [limit.primary, limit.secondary].flatMap((window, index) =>
        window ? [{ id: `${id}-${index}`, title, window, isSpark }] : [],
      );
    })
    .sort((left, right) => Number(left.isSpark) - Number(right.isSpark));
}

function getPlanName(data: CodexUsage): string | undefined {
  const planType = data.rateLimits.rateLimits.planType;

  if (!planType || planType === "unknown") {
    return undefined;
  }

  if (planType === "prolite") {
    return "Pro 5x";
  }

  if (planType === "pro") {
    return "Pro 20x";
  }

  return planType
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getProgressIcon(remaining: number): Icon {
  if (remaining <= 25) return Icon.CircleProgress25;
  if (remaining <= 50) return Icon.CircleProgress50;
  if (remaining <= 75) return Icon.CircleProgress75;
  return Icon.CircleProgress100;
}

function getRemainingColor(remaining: number): Color {
  if (remaining < 10) return Color.Red;
  if (remaining < 50) return Color.Yellow;
  return Color.Green;
}

function formatWindowDuration(minutes: number | null): string | undefined {
  if (!minutes) return undefined;
  if (minutes % (24 * 60) === 0) return `${minutes / (24 * 60)}-day limit`;
  if (minutes % 60 === 0) return `${minutes / 60}-hour limit`;
  return `${minutes}-minute limit`;
}

function formatResetDate(timestampSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(timestampSeconds * 1000));
}

function formatExpirationDate(timestampSeconds: number): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
  }).format(new Date(timestampSeconds * 1000));
}

function formatTokens(tokens: number | null): string {
  if (tokens === null) return "Unavailable";
  return `${formatCompactTokens(tokens)} tokens`;
}
