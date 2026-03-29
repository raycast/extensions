import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";

export default function RateLimitCommand() {
  const { data, isLoading, revalidate } = useCachedPromise(() => toshl.getRateLimitStatus());

  const limit = data?.limit ?? 0;
  const remaining = data?.remaining ?? 0;
  const unknownQuota = remaining < 0;
  const pct = !unknownQuota && limit > 0 ? Math.min(100, Math.round(((limit - remaining) / limit) * 100)) : 0;

  return (
    <List isLoading={isLoading} navigationTitle="Toshl API quota">
      <List.Section title="Current window" subtitle="Uses GET /rate-limit when available (does not consume quota)">
        <List.Item
          icon={{ source: Icon.Bolt, tintColor: Color.Blue }}
          title="Requests remaining"
          subtitle={
            unknownQuota
              ? "Quota endpoint unavailable — use X-RateLimit-* headers on API responses"
              : `${remaining} of ${limit} · ${pct}% used`
          }
          accessories={[
            {
              tag: {
                value: unknownQuota ? "n/a" : remaining < limit * 0.1 ? "Low" : "OK",
                color: unknownQuota ? Color.SecondaryText : remaining < limit * 0.1 ? Color.Red : Color.Green,
              },
            },
          ]}
          actions={
            <ActionPanel>
              <Action title="Refresh" icon={Icon.ArrowClockwise} onAction={() => revalidate()} />
            </ActionPanel>
          }
        />
      </List.Section>
    </List>
  );
}
