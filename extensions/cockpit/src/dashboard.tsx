import { Action, ActionPanel, Grid, Icon, Keyboard, openExtensionPreferences, showToast, Toast } from "@raycast/api";
import {
  accents,
  networkMetricCard,
  type NetworkMetricCard,
  quotaMetricCard,
  type QuotaMetricCard,
  type RingMetricCard,
  systemMetricCard,
  usageAccent,
} from "./lib/cards";
import {
  clampPercent,
  formatBytes,
  formatAge,
  formatDuration,
  formatRate,
  formatResetTime,
  formatWindowName,
  remainingPercent,
} from "./lib/format";
import { useCardImage } from "./lib/use-card-image";
import { useStatusSnapshot } from "./lib/use-status";
import type { ModuleKey, StatusSnapshot } from "./lib/types";
import type { ReactNode } from "react";

function shortProviderName(provider: string): string {
  return provider.replace(/^GPT-[^-]+-Codex-/i, "");
}

function isSparkLimit(id: string, name: string): boolean {
  return /spark/i.test(`${id} ${name}`);
}

function formatBytePair(usedBytes: number, totalBytes: number): string {
  const [usedValue, usedUnit] = formatBytes(usedBytes).split(" ");
  const [totalValue, totalUnit] = formatBytes(totalBytes).split(" ");
  return usedUnit === totalUnit
    ? `${usedValue} / ${totalValue} ${usedUnit}`
    : `${formatBytes(usedBytes)} / ${formatBytes(totalBytes)}`;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function average(values: number[], sampleCount: number): number {
  const samples = values.slice(-sampleCount);
  if (samples.length === 0) return 0;
  return samples.reduce((sum, value) => sum + value, 0) / samples.length;
}

function pendingDetail(snapshot: StatusSnapshot | undefined, key: ModuleKey): string {
  return snapshot?.errors[key] ? "Unavailable" : "Loading…";
}

function RefreshActions({ refresh }: { refresh: (forceCodex?: boolean) => Promise<void> }) {
  return (
    <ActionPanel>
      <Action
        title="Refresh Now"
        icon={Icon.ArrowClockwise}
        shortcut={Keyboard.Shortcut.Common.Refresh}
        onAction={async () => {
          await showToast({ style: Toast.Style.Animated, title: "Refreshing status…" });
          await refresh(true);
          await showToast({ style: Toast.Style.Success, title: "Status refreshed" });
        }}
      />
      <Action title="Open Extension Settings" icon={Icon.Gear} onAction={openExtensionPreferences} />
    </ActionPanel>
  );
}

function MetricCardItem({
  id,
  svg,
  tooltip,
  keywords,
  actions,
}: {
  id: string;
  svg: string;
  tooltip: string;
  keywords: string[];
  actions: ReactNode;
}) {
  const source = useCardImage(id, svg);
  return <Grid.Item id={id} content={{ value: source, tooltip }} keywords={keywords} actions={actions} />;
}

export default function Dashboard() {
  const { snapshot, networkHistory, isLoading, refresh, preferences } = useStatusSnapshot();
  const actions = <RefreshActions refresh={refresh} />;
  const refreshSeconds = Math.max(2, Number(preferences.dashboardRefreshSeconds));
  const networkAverageSamples = Math.max(1, Math.ceil(30 / refreshSeconds));
  const updatedAt = snapshot
    ? new Date(snapshot.updatedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : null;

  const systemCards: RingMetricCard[] = [];
  if (preferences.showCpu) {
    const cpu = snapshot?.cpu;
    systemCards.push({
      icon: "cpu",
      label: "CPU",
      percent: cpu?.percent ?? 0,
      value: cpu ? `${cpu.percent}%` : "—",
      detail: cpu ? "Current usage" : pendingDetail(snapshot, "cpu"),
      accent: cpu ? usageAccent(cpu.percent) : accents.neutral,
    });
  }
  if (preferences.showMemory) {
    const memory = snapshot?.memory;
    systemCards.push({
      icon: "memory",
      label: "Memory",
      percent: memory?.percent ?? 0,
      value: memory ? `${memory.percent}%` : "—",
      detail: memory ? formatBytePair(memory.usedBytes, memory.totalBytes) : pendingDetail(snapshot, "memory"),
      accent: memory ? usageAccent(memory.percent) : accents.neutral,
    });
  }
  if (preferences.showDisk) {
    const disk = snapshot?.disk;
    systemCards.push({
      icon: "disk",
      label: "Disk",
      percent: disk?.percent ?? 0,
      value: disk ? `${disk.percent}%` : "—",
      detail: disk ? `${formatBytes(disk.availableBytes)} free` : pendingDetail(snapshot, "disk"),
      accent: disk ? usageAccent(disk.percent) : accents.neutral,
    });
  }
  if (preferences.showUptime) {
    const uptime = snapshot?.uptime;
    systemCards.push({
      icon: "uptime",
      label: "Uptime",
      percent: 0,
      value: uptime ? formatDuration(uptime.seconds) : "—",
      detail: uptime ? "Since restart" : pendingDetail(snapshot, "uptime"),
      accent: uptime ? accents.blue : accents.neutral,
    });
  }
  if (preferences.showBattery) {
    const battery = snapshot?.battery;
    systemCards.push({
      icon: "battery",
      label: "Battery",
      percent: battery?.percent ?? 0,
      value: battery ? `${battery.percent}%` : "—",
      detail: battery ? capitalize(battery.state) : pendingDetail(snapshot, "battery"),
      accent: battery ? usageAccent(battery.percent, true) : accents.neutral,
    });
  }

  const networkCards: NetworkMetricCard[] = preferences.showNetwork
    ? [
        {
          direction: "down",
          value: snapshot?.network
            ? snapshot.network.ready
              ? formatRate(snapshot.network.downloadBytesPerSecond, preferences.networkUnits)
              : "Sampling…"
            : "—",
          average: snapshot?.network
            ? formatRate(average(networkHistory.download, networkAverageSamples), preferences.networkUnits)
            : "—",
          total: snapshot?.network ? formatBytes(snapshot.network.totalReceivedBytes) : "—",
          accent: accents.blue,
        },
        {
          direction: "up",
          value: snapshot?.network
            ? snapshot.network.ready
              ? formatRate(snapshot.network.uploadBytesPerSecond, preferences.networkUnits)
              : "Sampling…"
            : "—",
          average: snapshot?.network
            ? formatRate(average(networkHistory.upload, networkAverageSamples), preferences.networkUnits)
            : "—",
          total: snapshot?.network ? formatBytes(snapshot.network.totalSentBytes) : "—",
          accent: accents.purple,
        },
      ]
    : [];

  const codexQuotaCards: QuotaMetricCard[] = !preferences.showCodex
    ? []
    : snapshot?.codex
      ? snapshot.codex.limits
          .filter((limit) => preferences.showSpark || !isSparkLimit(limit.id, limit.name))
          .flatMap((limit) =>
            [
              { kind: "primary", window: limit.primary },
              { kind: "secondary", window: limit.secondary },
            ]
              .filter((entry) => entry.window != null)
              .map(({ kind, window }) => {
                const remaining = remainingPercent(window!);
                const windowName = formatWindowName(window!.windowDurationMins).replace(/ window$/i, "");
                return {
                  id: `${limit.id}-${kind}`,
                  label: `${shortProviderName(limit.name)} · ${windowName}`,
                  percent: remaining,
                  reset: `Resets in ${formatResetTime(window!.resetsAt).split(" · ")[0]}`,
                  accent: usageAccent(remaining, true),
                };
              }),
          )
      : [
          {
            id: "pending",
            label: "Codex usage",
            percent: null,
            reset: pendingDetail(snapshot, "codex"),
            accent: accents.neutral,
          },
        ];

  const claudeQuotaCards: QuotaMetricCard[] = !preferences.showClaude
    ? []
    : snapshot?.claude
      ? snapshot.claude.windows.map((window) => {
          const remaining = clampPercent(100 - window.usedPercent);
          return {
            id: `claude-${window.id}`,
            label: `Claude · ${window.name}`,
            percent: remaining,
            reset: formatAge(snapshot.claude!.updatedAt),
            accent: usageAccent(remaining, true),
          };
        })
      : [
          {
            id: "claude-pending",
            label: "Claude usage",
            percent: null,
            reset: pendingDetail(snapshot, "claude"),
            accent: accents.neutral,
          },
        ];

  const quotaCards = [...codexQuotaCards, ...claudeQuotaCards];

  const networkSubtitle = snapshot?.network ? `${snapshot.network.interfaceName} · 30s` : "30s";
  const loadedQuotaCount = quotaCards.filter((card) => card.percent != null).length;
  const quotaSubtitle = loadedQuotaCount > 0 ? `${loadedQuotaCount} windows` : "Loading…";
  const hasMetrics = systemCards.length > 0 || networkCards.length > 0 || quotaCards.length > 0;
  const emptyMessage =
    Object.values(snapshot?.errors ?? {})
      .filter(Boolean)
      .join(" · ") || "Choose the metrics to display in extension settings.";

  return (
    <Grid
      isLoading={isLoading}
      navigationTitle="Cockpit"
      searchBarPlaceholder="Filter metrics…"
      columns={5}
      aspectRatio="16/9"
      fit={Grid.Fit.Fill}
      inset={Grid.Inset.Zero}
    >
      {!hasMetrics ? (
        <Grid.EmptyView title="No Metrics Available" description={emptyMessage} icon={Icon.Gauge} />
      ) : null}

      {systemCards.length > 0 ? (
        <Grid.Section
          title="System"
          subtitle={updatedAt ? `${systemCards.length} metrics · ${updatedAt}` : `${systemCards.length} metrics`}
          columns={5}
          aspectRatio="16/9"
          fit={Grid.Fit.Fill}
          inset={Grid.Inset.Zero}
        >
          {systemCards.map((card) => (
            <MetricCardItem
              key={card.label}
              id={`system-${card.label.toLowerCase()}`}
              svg={systemMetricCard(card)}
              tooltip={`${card.label}: ${card.value} · ${card.detail}`}
              keywords={[card.label, card.value, card.detail]}
              actions={actions}
            />
          ))}
        </Grid.Section>
      ) : null}

      {networkCards.length > 0 ? (
        <Grid.Section
          title="Network"
          subtitle={networkSubtitle}
          columns={5}
          aspectRatio="16/9"
          fit={Grid.Fit.Fill}
          inset={Grid.Inset.Zero}
        >
          {networkCards.map((card) => {
            const label = card.direction === "down" ? "Download" : "Upload";
            return (
              <MetricCardItem
                key={card.direction}
                id={`network-${card.direction}`}
                svg={networkMetricCard(card)}
                tooltip={`${label}: ${card.value} · 30s average ${card.average} · Total ${card.total}`}
                keywords={[label, card.value, card.average, card.total]}
                actions={actions}
              />
            );
          })}
        </Grid.Section>
      ) : null}

      {quotaCards.length > 0 ? (
        <Grid.Section
          title="Token quota"
          subtitle={quotaSubtitle}
          columns={5}
          aspectRatio="16/9"
          fit={Grid.Fit.Fill}
          inset={Grid.Inset.Zero}
        >
          {quotaCards.map((card) => (
            <MetricCardItem
              key={card.id}
              id={`quota-${card.id}`}
              svg={quotaMetricCard(card)}
              tooltip={
                card.percent == null
                  ? `${card.label}: ${card.reset}`
                  : `${card.label}: ${card.percent}% · ${card.reset}`
              }
              keywords={[card.label, card.percent == null ? "loading" : `${card.percent}%`, card.reset]}
              actions={actions}
            />
          ))}
        </Grid.Section>
      ) : null}
    </Grid>
  );
}
