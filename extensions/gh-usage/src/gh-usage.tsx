import {
  ActionPanel,
  Action,
  Color,
  Icon,
  List,
  openExtensionPreferences,
  showToast,
  Toast,
  updateCommandMetadata,
} from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { RESOURCE_ICONS, RESOURCE_LABELS, RESOURCE_ORDER } from "./types";
import {
  formatAgo,
  formatCountdown,
  formatReset,
  progressBar,
  useGHRateLimit,
  usagePct,
} from "./useGHRateLimit";
import { getRefreshIntervalMs } from "./preferences";

function usageColor(pct: number): Color {
  if (pct >= 80) return Color.Red;
  if (pct >= 50) return Color.Yellow;
  return Color.PrimaryText;
}

function buildSubtitle(last: Date | null, nextMs: number | null): string {
  const parts: string[] = [];
  if (last) parts.push(`Last refresh: ${formatAgo(last)}`);
  if (nextMs) parts.push(`next in ${formatCountdown(nextMs)}`);
  return parts.join(" · ");
}

export default function GHUsage() {
  const { data, isLoading, error, revalidate } = useGHRateLimit();
  const lastRefreshed = useRef<Date | null>(null);
  const nextRefreshAt = useRef<number | null>(null);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (error) {
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch rate limits",
        message: String(error),
      });
    }
  }, [error]);

  useEffect(() => {
    if (data) {
      lastRefreshed.current = new Date();
      nextRefreshAt.current = Date.now() + getRefreshIntervalMs();
      updateCommandMetadata({
        subtitle: buildSubtitle(lastRefreshed.current, nextRefreshAt.current),
      });
    }
  }, [data]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
      updateCommandMetadata({
        subtitle: buildSubtitle(lastRefreshed.current, nextRefreshAt.current),
      });
    }, 10_000);
    return () => clearInterval(interval);
  }, []);

  const resources = data?.resources;

  const items = RESOURCE_ORDER.filter(
    (key) => resources && key in resources,
  ).map((key) => {
    const resource = resources![key as keyof NonNullable<typeof resources>];
    if (!resource) return null;

    const pct = usagePct(resource.used, resource.limit);
    const label = RESOURCE_LABELS[key] ?? key;
    const color = usageColor(pct);
    const icon = RESOURCE_ICONS[key] ?? Icon.Circle;
    const bar = progressBar(resource.used, resource.limit);

    return (
      <List.Item
        key={key}
        title={label}
        subtitle={`${pct}% used`}
        icon={{ source: icon, tintColor: color }}
        detail={
          <List.Item.Detail
            metadata={
              <List.Item.Detail.Metadata>
                <List.Item.Detail.Metadata.Label
                  title="Progress"
                  text={`${bar} ${pct}%`}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Used"
                  text={`${resource.used.toLocaleString()} of ${resource.limit.toLocaleString()}`}
                />
                <List.Item.Detail.Metadata.Label
                  title="Left"
                  text={resource.remaining.toLocaleString()}
                />
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label
                  title="Resets"
                  text={`in ${formatReset(resource.reset)}`}
                />
              </List.Item.Detail.Metadata>
            }
          />
        }
        actions={
          <ActionPanel>
            <Action
              title="Refresh"
              icon={Icon.ArrowClockwise}
              onAction={revalidate}
            />
            <Action
              title="Preferences…"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
            />
          </ActionPanel>
        }
      />
    );
  });

  return (
    <List isLoading={isLoading} isShowingDetail>
      {items}
    </List>
  );
}
