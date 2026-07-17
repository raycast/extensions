import { useState } from "react";
import { Action, ActionPanel, Grid, Icon, Image } from "@raycast/api";
import { showFailureToast, useCachedPromise } from "@raycast/utils";
import { fetchAggregatedMetrics, fetchChannels } from "./lib/buffer";
import { Channel, PostMetric } from "./lib/types";
import {
  computeDelta,
  formatMetricValue,
  metricTileSvg,
  serviceLabel,
} from "./lib/format";

// Buffer's free plan limits Insights to the last 31 days, so periods stay ≤ 31.
const PERIODS = [7, 14, 28] as const;
type Period = (typeof PERIODS)[number];
const DEFAULT_PERIOD: Period = 7;

export default function Command() {
  const { data, isLoading } = useCachedPromise(fetchChannels, [], {
    onError(error) {
      showFailureToast(error, { title: "Could not load channels" });
    },
  });

  return (
    <Grid isLoading={isLoading} columns={4} inset={Grid.Inset.Small}>
      <Grid.EmptyView title="No connected channels" icon={Icon.Tray} />
      {(data ?? []).map((channel) => (
        <Grid.Item
          key={channel.id}
          content={
            channel.avatar
              ? { source: channel.avatar, mask: Image.Mask.Circle }
              : Icon.Person
          }
          title={channel.displayName || channel.name}
          subtitle={serviceLabel(channel.service)}
          actions={
            <ActionPanel>
              <Action.Push
                title="Show Analytics"
                icon={Icon.BarChart}
                target={<ChannelAnalytics channel={channel} />}
              />
            </ActionPanel>
          }
        />
      ))}
    </Grid>
  );
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function ChannelAnalytics({ channel }: { channel: Channel }) {
  const [period, setPeriod] = useState<Period>(DEFAULT_PERIOD);

  const { data, isLoading } = useCachedPromise(
    async (channelId: string, days: Period) => {
      const now = new Date().toISOString();
      const current = await fetchAggregatedMetrics(channelId, isoDaysAgo(days), now);
      // The comparison window may fall outside the free-plan 31-day history –
      // treat it as best-effort so tiles still render (just without a delta).
      let previous: PostMetric[] = [];
      try {
        const prev = await fetchAggregatedMetrics(
          channelId,
          isoDaysAgo(days * 2),
          isoDaysAgo(days),
        );
        previous = prev.metrics;
      } catch {
        previous = [];
      }
      return { current: current.metrics, previous };
    },
    [channel.id, period],
    {
      onError(error) {
        showFailureToast(error, { title: "Could not load metrics" });
      },
      initialData: { current: [], previous: [] },
    },
  );

  const prevByKey = new Map(data.previous.map((m) => [m.type || m.name, m.value]));
  const current = data.current;

  return (
    <Grid
      isLoading={isLoading}
      columns={5}
      navigationTitle={`${channel.displayName || channel.name} · Analytics`}
      inset={Grid.Inset.Zero}
      searchBarAccessory={
        <Grid.Dropdown
          tooltip="Period"
          value={String(period)}
          onChange={(v) => setPeriod(Number(v) as Period)}
        >
          {PERIODS.map((p) => (
            <Grid.Dropdown.Item key={p} title={`Last ${p} days`} value={String(p)} />
          ))}
        </Grid.Dropdown>
      }
    >
      <Grid.EmptyView
        title="No metrics available"
        description="This channel has no aggregated metrics for the selected period."
        icon={Icon.BarChart}
      />
      {current.map((m) => {
        const prev = prevByKey.get(m.type || m.name);
        const delta = prev !== undefined ? computeDelta(m.value, prev) : null;
        const deltaLabel = delta
          ? `${delta.direction === "up" ? "+" : delta.direction === "down" ? "" : "±"}${delta.pct}% vs. prev.`
          : "no prior data";
        return (
          <Grid.Item
            key={m.type + m.name}
            content={{ source: metricTileSvg(m.name, m.value, delta) }}
            title={`${m.name}: ${formatMetricValue(m)}`}
            subtitle={deltaLabel}
          />
        );
      })}
    </Grid>
  );
}
