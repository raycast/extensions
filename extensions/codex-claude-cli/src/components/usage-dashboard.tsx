import { Action, ActionPanel, Color, environment, Icon, List, showToast, Toast } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useRef } from "react";

import { connectClaudeStatusLine, disconnectClaudeStatusLine } from "../lib/claude-statusline";
import { escapeUsageMarkdown, usageGaugeMarkdown } from "../lib/usage-gauge";

import { useUsage } from "../hooks/use-usage";
import { providerIcon } from "../lib/presentation";
import { shortcut, useShortcutStore } from "../lib/shortcuts";
import {
  providerRemainingPercent,
  currentUsageWindows,
  invalidateUsageCache,
  isUsageStateFresh,
  refreshUsageState,
  usageProviderName,
  type ProviderUsageState,
  type UsageCredits,
  type UsageTokenStats,
  type UsageWindow,
} from "../lib/usage";
import type { ChatProvider } from "../lib/types";

const providerOrder: ChatProvider[] = ["claude", "codex"];
const numberFormatter = new Intl.NumberFormat("en-US");
const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function UsageDashboard() {
  useShortcutStore();
  const { snapshot, isLoading, error, refresh } = useUsage({ refreshIntervalMilliseconds: 60_000 });

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder={"Provider usage…"}>
      {providerOrder.map((provider) => {
        const state = snapshot?.providers[provider] || {
          provider,
          source: "unavailable" as const,
          error: error?.message,
        };
        return <UsageProviderItem key={provider} state={state} onRefresh={() => refresh(true)} />;
      })}
      {snapshot?.customProviders.map((state) => (
        <UsageProviderItem key={state.provider} state={state} onRefresh={() => refresh(true)} />
      ))}
    </List>
  );
}

function UsageProviderItem({ state, onRefresh }: { state: ProviderUsageState; onRefresh: () => Promise<void> }) {
  state = refreshUsageState(state);
  const providerTitle = usageProviderName(state);
  const changingConnection = useRef(false);
  const remainingPercent = isUsageStateFresh(state)
    ? providerRemainingPercent(state.data && { ...state.data, windows: currentUsageWindows(state) })
    : undefined;
  async function changeConnection(connect: boolean) {
    if (changingConnection.current) return;
    changingConnection.current = true;
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: connect ? "Connecting Claude Code" : "Disconnecting Claude Code",
    });
    try {
      await invalidateUsageCache();
      try {
        if (connect) await connectClaudeStatusLine();
        else await disconnectClaudeStatusLine();
      } finally {
        await invalidateUsageCache();
        await onRefresh();
      }
      toast.style = Toast.Style.Success;
      toast.title = connect ? "Claude Code connected" : "Claude Code disconnected";
      if (connect) toast.message = "Restart Claude Code, then continue a conversation to update usage.";
    } catch (error) {
      await toast.hide();
      await showFailureToast(error, {
        title: connect ? "Could not connect Claude Code" : "Could not disconnect Claude Code",
      });
    } finally {
      changingConnection.current = false;
    }
  }
  const accessories: List.Item.Accessory[] = [];
  if (remainingPercent !== undefined) {
    accessories.push({
      icon: {
        source: progressIcon(remainingPercent),
        tintColor: usageColor(remainingPercent),
      },
      text: {
        value: formatPercent(remainingPercent),
        color: usageColor(remainingPercent),
      },
      tooltip: `${formatPercent(remainingPercent)} ${"remaining"}`,
    });
  }
  if (state.source === "stale") {
    accessories.push({ icon: Icon.Warning, tooltip: "Last valid value" });
  } else if (state.source === "unavailable") {
    accessories.push({ icon: Icon.ExclamationMark, tooltip: sourceLabel(state) });
  }

  const subtitle = [planTitle(state.data?.plan), sourceLabel(state)].filter(Boolean).join(" · ");

  return (
    <List.Item
      id={state.provider}
      icon={state.provider === "claude" || state.provider === "codex" ? providerIcon(state.provider) : Icon.Gauge}
      title={providerTitle}
      subtitle={subtitle}
      accessories={accessories}
      detail={<UsageDetail state={state} />}
      actions={
        <ActionPanel>
          {state.provider === "claude" && state.needsConnection ? (
            <Action title="Connect Claude Code" icon={Icon.Plug} onAction={() => changeConnection(true)} />
          ) : null}
          <Action
            title={"Refresh Usage"}
            icon={Icon.ArrowClockwise}
            shortcut={shortcut("common.refresh")}
            onAction={onRefresh}
          />
          {state.provider === "claude" && state.bridgeConnected ? (
            <Action title="Disconnect Claude Code" icon={Icon.Plug} onAction={() => changeConnection(false)} />
          ) : null}
          {safeDashboardUrl(state.data?.dashboardUrl) ? (
            <Action.OpenInBrowser title="Open Provider Dashboard" url={safeDashboardUrl(state.data?.dashboardUrl)!} />
          ) : null}
          {state.data ? (
            <Action.CopyToClipboard
              title={"Copy Summary"}
              content={plainUsageSummary(state)}
              shortcut={shortcut("usage.copy")}
            />
          ) : null}
        </ActionPanel>
      }
    />
  );
}

function UsageDetail({ state }: { state: ProviderUsageState }) {
  return <List.Item.Detail markdown={usageMarkdown(state)} />;
}

function usageMarkdown(state: ProviderUsageState): string {
  if (!state.data) {
    const unavailable = [
      `# ${escapeUsageMarkdown(usageProviderName(state))}`,
      "",
      state.needsConnection
        ? "Connect Claude Code to read its status-line usage. Your existing status line is preserved."
        : state.bridgeConnected
          ? "Waiting for Claude Code. Restart it, then continue a conversation to update usage."
          : "**Usage unavailable**",
    ];
    if (state.error) unavailable.push("", escapeUsageMarkdown(state.error));
    if (state.lastAttemptAt) {
      unavailable.push("", `_${"Last attempt"} · ${dateFormatter.format(state.lastAttemptAt)}_`);
    }
    return unavailable.join("\n");
  }

  const fresh = isUsageStateFresh(state);
  const sections = [
    `# ${escapeUsageMarkdown(usageProviderName(state))}`,
    escapeUsageMarkdown([planTitle(state.data.plan), sourceLabel(state)].filter(Boolean).join(" · ")),
  ];
  if (!fresh)
    sections.push("", `> Last observation · ${escapeUsageMarkdown(state.error || "Waiting for a fresh reading.")}`);
  const windows = fresh ? currentUsageWindows(state) : state.data.windows;
  if (windows.length === 0) {
    sections.push("", "No limits are available for this account.");
  } else {
    for (const window of windows) sections.push("", usageWindowMarkdown(window, !fresh));
  }

  const credits = creditsMarkdown(state.data.credits);
  if (credits) sections.push("", `### ${"Credits"}`, credits);

  const tokens = tokensMarkdown(state.data.tokens);
  if (tokens) sections.push("", "### Tokens", tokens);

  sections.push("", "---", "", `_${"Updated"} · ${dateFormatter.format(state.data.fetchedAt)}_`);
  return sections.join("\n");
}

function usageWindowMarkdown(window: UsageWindow, stale: boolean): string {
  const rows = [
    `### ${escapeUsageMarkdown(window.title)}`,
    "",
    usageGaugeMarkdown(window.remainingPercent, window.title, environment.appearance === "dark", stale),
  ];
  if (window.resetsAt) {
    rows.push(
      "",
      window.resetsAt <= Date.now()
        ? "**Reset passed** · waiting for an update"
        : `**Resets in ${formatResetCompact(window.resetsAt)}**`,
    );
  }
  return rows.join("\n");
}

function safeDashboardUrl(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function creditsMarkdown(credits: UsageCredits | undefined): string | undefined {
  if (!credits) return undefined;
  const rows: string[] = [];
  if (credits.unlimited) rows.push("unlimited additional access");
  else if (credits.hasCredits !== undefined)
    rows.push(`${"credits"} ${credits.hasCredits ? "available" : "unavailable"}`);
  if (credits.balance) rows.push(`${"balance"} ${credits.balance}`);
  if (credits.monthlyLimit !== undefined) {
    rows.push(`${"limit"} ${formatMoney(credits.monthlyLimit, credits.currency)}`);
  }
  if (credits.usedCredits !== undefined) {
    rows.push(`${"used"} ${formatMoney(credits.usedCredits, credits.currency)}`);
  }
  if (credits.utilization !== undefined) rows.push(`${formatPercent(credits.utilization)} ${"used"}`);
  if (credits.spendingLimit) rows.push(`${"spending limit"} ${credits.spendingLimit}`);
  if (credits.spent) rows.push(`${"spent"} ${credits.spent}`);
  if (credits.remainingPercent !== undefined) {
    rows.push(`${formatPercent(credits.remainingPercent)} ${"available"}`);
  }
  if (credits.resetsAt) rows.push(`${"reset"} ${formatResetCompact(credits.resetsAt)}`);
  return rows.length > 0 ? escapeUsageMarkdown(rows.join(" · ")) : undefined;
}

function tokensMarkdown(tokens: UsageTokenStats | undefined): string | undefined {
  if (!tokens) return undefined;
  const rows: string[] = [];
  if (tokens.lifetimeTokens !== undefined) rows.push(`${"lifetime"} ${formatTokens(tokens.lifetimeTokens)}`);
  if (tokens.peakDailyTokens !== undefined) rows.push(`${"daily peak"} ${formatTokens(tokens.peakDailyTokens)}`);
  if (tokens.inputTokens !== undefined) rows.push(`${"input"} ${formatTokens(tokens.inputTokens)}`);
  if (tokens.outputTokens !== undefined) rows.push(`${"output"} ${formatTokens(tokens.outputTokens)}`);
  if (tokens.cacheReadTokens !== undefined) rows.push(`${"cache read"} ${formatTokens(tokens.cacheReadTokens)}`);
  if (tokens.cacheCreationTokens !== undefined) {
    rows.push(`${"cache created"} ${formatTokens(tokens.cacheCreationTokens)}`);
  }
  if (tokens.currentStreakDays !== undefined) rows.push(`${"streak"} ${tokens.currentStreakDays} ${"days"}`);
  if (tokens.longestStreakDays !== undefined) rows.push(`${"best streak"} ${tokens.longestStreakDays} ${"days"}`);
  const latestBucket = tokens.dailyBuckets?.at(-1);
  if (latestBucket) rows.push(`${latestBucket.date} ${formatTokens(latestBucket.tokens)}`);
  return rows.length > 0 ? escapeUsageMarkdown(rows.join(" · ")) : undefined;
}

function plainUsageSummary(state: ProviderUsageState): string {
  if (!state.data) return state.error || "No usage data";
  const title = usageProviderName(state);
  const windows = state.data.windows.map(
    (window) =>
      `${window.title}: ${formatPercent(window.remainingPercent)} ${"remaining"}${
        window.resetsAt ? `, ${"resets"} ${formatReset(window.resetsAt)}` : ""
      }`,
  );
  return [
    `${title} · ${planTitle(state.data.plan) || "Plan unavailable"} · ${sourceLabel(state)}`,
    ...windows,
    `Observed ${dateFormatter.format(state.data.fetchedAt)}`,
  ].join("\n");
}

function sourceLabel(state: ProviderUsageState): string {
  if (state.needsConnection) return "Connect";
  if (state.bridgeConnected && !state.data) return "Waiting for Claude Code";
  if (state.source === "live")
    return state.provider === "claude" || state.provider.startsWith("custom-") ? "Latest observation" : "Live";
  if (state.source === "cache") return "Recent cache";
  if (state.source === "stale") return "Last valid value";
  return state.error ? "Error" : "Checking";
}

function planTitle(plan: string | undefined): string | undefined {
  if (!plan) return undefined;
  const normalized = plan.toLowerCase();
  const knownPlans: Record<string, string> = {
    free: "Free",
    plus: "Plus",
    pro: "Pro",
    max: "Max",
    team: "Team",
    business: "Business",
    enterprise: "Enterprise",
  };
  return knownPlans[normalized] || plan.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function usageColor(remainingPercent: number): Color {
  if (remainingPercent <= 15) return Color.Red;
  if (remainingPercent <= 35) return Color.Yellow;
  return Color.Green;
}

function progressIcon(remainingPercent: number): Icon {
  if (remainingPercent >= 88) return Icon.CircleProgress100;
  if (remainingPercent >= 63) return Icon.CircleProgress75;
  if (remainingPercent >= 38) return Icon.CircleProgress50;
  if (remainingPercent >= 13) return Icon.CircleProgress25;
  return Icon.Circle;
}

function formatPercent(value: number): string {
  return `${Math.round(clamp(value, 0, 100) * 10) / 10}%`;
}

function formatTokens(value: number): string {
  return `${value >= 10_000 ? compactNumberFormatter.format(value) : numberFormatter.format(value)} tokens`;
}

function formatMoney(value: number, currency: string | undefined): string {
  if (!currency) return numberFormatter.format(value);
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
  } catch {
    return `${numberFormatter.format(value)} ${currency}`;
  }
}

function formatReset(timestamp: number): string {
  const elapsed = timestamp - Date.now();
  if (elapsed <= 0) return "now";
  const minutes = Math.ceil(elapsed / 60_000);
  let relative: string;
  if (minutes < 60) relative = `${"in"} ${minutes} min`;
  else if (minutes < 1_440) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    relative = remainingMinutes > 0 ? `${"in"} ${hours} h ${remainingMinutes} min` : `${"in"} ${hours} h`;
  } else {
    const days = Math.floor(minutes / 1_440);
    const hours = Math.floor((minutes % 1_440) / 60);
    relative = hours > 0 ? `${"in"} ${days} d ${hours} h` : `${"in"} ${days} d`;
  }
  return `${dateFormatter.format(timestamp)} · ${relative}`;
}

function formatResetCompact(timestamp: number): string {
  const elapsed = timestamp - Date.now();
  if (elapsed <= 0) return "now";
  const minutes = Math.ceil(elapsed / 60_000);
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 1_440) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return remainingMinutes > 0 ? `${hours} h ${remainingMinutes} min` : `${hours} h`;
  }
  const days = Math.floor(minutes / 1_440);
  const hours = Math.floor((minutes % 1_440) / 60);
  return hours > 0 ? `${days} d ${hours} h` : `${days} d`;
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}
