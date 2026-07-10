import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Keyboard,
  List,
  getPreferenceValues,
  openExtensionPreferences,
} from "@raycast/api";
import { getProgressIcon, useCachedPromise } from "@raycast/utils";
import { readClaudeQuota } from "./lib/claude";
import { readCodexQuota } from "./lib/codex";
import { readUsage } from "./lib/usage";
import type { QuotaWindow, ToolQuota, ToolUsage, UsagePeriod } from "./lib/types";
import { formatCountdown, formatTokens, relativeTime, remainingColor, remainingPercent } from "./lib/format";

interface Preferences {
  lowQuotaThreshold?: string;
  claudeDir?: string;
  codexDir?: string;
  npxPath?: string;
}

function clampThreshold(raw?: string): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return 20;
  return Math.max(0, Math.min(100, n));
}

/** A snapshot window whose reset time has already passed reset since it was captured. */
function windowIsStale(window: QuotaWindow, source: string): boolean {
  return source === "snapshot" && window.resetsAt * 1000 <= Date.now();
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const threshold = clampThreshold(prefs.lowQuotaThreshold);

  const claudeQuota = useCachedPromise(readClaudeQuota, [prefs.claudeDir]);
  const codexQuota = useCachedPromise(readCodexQuota, [prefs.codexDir]);
  const claudeUsage = useCachedPromise((p?: string) => readUsage("claude", p), [prefs.npxPath]);
  const codexUsage = useCachedPromise((p?: string) => readUsage("codex", p), [prefs.npxPath]);

  const refresh = () => {
    claudeQuota.revalidate();
    codexQuota.revalidate();
    claudeUsage.revalidate();
    codexUsage.revalidate();
  };
  const loading = claudeQuota.isLoading || codexQuota.isLoading || claudeUsage.isLoading || codexUsage.isLoading;

  return (
    <List isShowingDetail isLoading={loading}>
      <ToolItem
        fallbackName="Claude Code"
        quota={claudeQuota.data}
        usage={claudeUsage.data}
        loading={claudeQuota.isLoading}
        threshold={threshold}
        refresh={refresh}
      />
      <ToolItem
        fallbackName="Codex"
        quota={codexQuota.data}
        usage={codexUsage.data}
        loading={codexQuota.isLoading}
        threshold={threshold}
        refresh={refresh}
      />
    </List>
  );
}

function ToolItem(props: {
  fallbackName: string;
  quota: ToolQuota | undefined;
  usage: ToolUsage | undefined;
  loading: boolean;
  threshold: number;
  refresh: () => void;
}) {
  const { fallbackName, quota, usage, loading, threshold, refresh } = props;
  return (
    <List.Item
      title={quota?.tool ?? fallbackName}
      icon={toolIcon(quota, loading, threshold)}
      accessories={toolAccessories(quota, loading, threshold)}
      detail={<ToolDetail quota={quota} usage={usage} loading={loading} threshold={threshold} />}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            shortcut={Keyboard.Shortcut.Common.Refresh}
            onAction={refresh}
          />
          <Action title="Open Extension Preferences" icon={Icon.Gear} onAction={openExtensionPreferences} />
        </ActionPanel>
      }
    />
  );
}

function toolIcon(quota: ToolQuota | undefined, loading: boolean, threshold: number) {
  const first = quota?.windows[0];
  if (!first || quota?.error || (loading && !quota)) {
    return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
  if (windowIsStale(first, quota.source)) {
    return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
  return { source: Icon.Dot, tintColor: remainingColor(remainingPercent(first.usedPercent), threshold) };
}

function toolAccessories(quota: ToolQuota | undefined, loading: boolean, threshold: number): List.Item.Accessory[] {
  if (loading && !quota) return [{ tag: { value: "…", color: Color.SecondaryText } }];
  if (!quota || quota.error) return [{ tag: { value: "unavailable", color: Color.SecondaryText } }];
  const first = quota.windows[0];
  if (!first) return [{ tag: { value: "—", color: Color.SecondaryText } }];
  if (windowIsStale(first, quota.source)) return [{ tag: { value: "stale", color: Color.SecondaryText } }];
  const remaining = remainingPercent(first.usedPercent);
  return [{ tag: { value: `${remaining.toFixed(0)}%`, color: remainingColor(remaining, threshold) } }];
}

function windowRow(window: QuotaWindow, source: string, threshold: number) {
  if (windowIsStale(window, source)) {
    return (
      <List.Item.Detail.Metadata.Label
        key={window.name}
        title={window.name}
        icon={{ source: Icon.CircleProgress, tintColor: Color.SecondaryText }}
        text="reset since snapshot"
      />
    );
  }
  const remaining = remainingPercent(window.usedPercent);
  return (
    <List.Item.Detail.Metadata.Label
      key={window.name}
      title={window.name}
      icon={getProgressIcon(remaining / 100, remainingColor(remaining, threshold))}
      text={`${remaining.toFixed(0)}% left · resets in ${formatCountdown(window.resetsAt)}`}
    />
  );
}

function quotaSection(quota: ToolQuota | undefined, threshold: number) {
  if (!quota) {
    return <List.Item.Detail.Metadata.Label title="Quota" text="…" />;
  }
  if (quota.error) {
    return (
      <List.Item.Detail.Metadata.Label
        title="Quota"
        icon={{ source: Icon.ExclamationMark, tintColor: Color.SecondaryText }}
        text={quota.error}
      />
    );
  }
  if (quota.windows.length === 0) {
    return <List.Item.Detail.Metadata.Label title="Quota" text="no windows" />;
  }
  return [
    <List.Item.Detail.Metadata.Label key="__quota-hdr" title="Quota" text="remaining · resets in" />,
    ...quota.windows.map((window) => windowRow(window, quota.source, threshold)),
  ];
}

function usageRow(title: string, period: UsagePeriod | undefined) {
  const text = period ? `${formatTokens(period.totalTokens)} tok · $${period.cost.toFixed(2)}` : "—";
  return <List.Item.Detail.Metadata.Label key={title} title={title} text={text} />;
}

function usageSection(usage: ToolUsage | undefined) {
  if (!usage) {
    return <List.Item.Detail.Metadata.Label title="Usage" text="…" />;
  }
  if (usage.error) {
    return (
      <List.Item.Detail.Metadata.Label
        title="Usage"
        icon={{ source: Icon.ExclamationMark, tintColor: Color.SecondaryText }}
        text={usage.error}
      />
    );
  }
  return [
    <List.Item.Detail.Metadata.Label key="__usage-hdr" title="Usage" text="tokens · cost" />,
    usageRow("Today", usage.today),
    usageRow("This Week", usage.week),
  ];
}

function tailSection(quota: ToolQuota | undefined) {
  const rows = [];
  if (quota?.planType) {
    rows.push(<List.Item.Detail.Metadata.Label key="plan" title="Plan" text={quota.planType} />);
  }
  if (typeof quota?.totalTokens === "number") {
    rows.push(
      <List.Item.Detail.Metadata.Label key="session" title="Session Tokens" text={formatTokens(quota.totalTokens)} />,
    );
  }
  if (quota && !quota.error) {
    rows.push(
      <List.Item.Detail.Metadata.Label
        key="fresh"
        title={quota.source === "live" ? "Fetched" : "Snapshot"}
        icon={Icon.Clock}
        text={quota.fetchedAt ? relativeTime(quota.fetchedAt) : "unknown"}
      />,
      <List.Item.Detail.Metadata.Label
        key="source"
        title="Source"
        text={
          quota.source === "live"
            ? `Live · ${quota.tool === "Codex" ? "chatgpt.com" : "api.anthropic.com"}`
            : "Local log snapshot"
        }
      />,
    );
  }
  if (rows.length === 0) return null;
  return [<List.Item.Detail.Metadata.Separator key="__tail-sep" />, ...rows];
}

function ToolDetail(props: {
  quota: ToolQuota | undefined;
  usage: ToolUsage | undefined;
  loading: boolean;
  threshold: number;
}) {
  const { quota, usage, loading, threshold } = props;
  if (!quota && !usage && loading) {
    return <List.Item.Detail markdown="Loading…" />;
  }
  return (
    <List.Item.Detail
      metadata={
        <List.Item.Detail.Metadata>
          {quotaSection(quota, threshold)}
          <List.Item.Detail.Metadata.Separator />
          {usageSection(usage)}
          {tailSection(quota)}
        </List.Item.Detail.Metadata>
      }
    />
  );
}
