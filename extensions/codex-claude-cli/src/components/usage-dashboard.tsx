import { Action, ActionPanel, Color, Icon, List } from "@raycast/api";

import { useUsage } from "../hooks/use-usage";
import { providerIcon } from "../lib/presentation";
import { shortcut, shortcutLabel, useShortcutStore } from "../lib/shortcuts";
import {
  providerRemainingPercent,
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
  const { snapshot, isLoading, error, refresh } = useUsage();

  return (
    <List isShowingDetail isLoading={isLoading} searchBarPlaceholder={"Claude and Codex usage…"}>
      {providerOrder.map((provider) => {
        const state = snapshot?.providers[provider] || {
          provider,
          source: "unavailable" as const,
          error: error?.message,
        };
        return <UsageProviderItem key={provider} state={state} onRefresh={() => refresh(true)} />;
      })}
    </List>
  );
}

function UsageProviderItem({ state, onRefresh }: { state: ProviderUsageState; onRefresh: () => Promise<void> }) {
  const providerTitle = state.provider === "claude" ? "Claude" : "Codex";
  const remainingPercent = providerRemainingPercent(state.data);
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
      icon={providerIcon(state.provider)}
      title={providerTitle}
      subtitle={subtitle}
      accessories={accessories}
      detail={<UsageDetail state={state} />}
      actions={
        <ActionPanel>
          <Action
            title={"Refresh Usage"}
            icon={Icon.ArrowClockwise}
            shortcut={shortcut("common.refresh")}
            onAction={onRefresh}
          />
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
    const unavailable = [`**${"Usage unavailable"}**`];
    if (state.error) unavailable.push("", state.error);
    if (state.lastAttemptAt) {
      unavailable.push("", `_${"Last attempt"} · ${dateFormatter.format(state.lastAttemptAt)}_`);
    }
    return unavailable.join("\n");
  }

  const providerTitle = state.provider === "claude" ? "Claude" : "Codex";
  const remaining = providerRemainingPercent(state.data);
  const sections = [
    `# ${providerTitle}`,
    remaining === undefined ? `## ${"Usage unavailable"}` : `## ${formatPercent(remaining)} ${"available"}`,
    `**${planTitle(state.data.plan) || "Plan unavailable"}**  ·  ${sourceLabel(state)}`,
  ];
  if (state.source === "cache") {
    sections.push(
      "",
      `> **${"Recent cache"}** · ${"Use"} \`${shortcutLabel("common.refresh")}\` ${"to request a live value."}`,
    );
  } else if (state.source === "stale") {
    sections.push("", `> ${"Last valid value"} · ${state.error || "Refresh failed."}`);
  }

  if (state.data.windows.length === 0) {
    sections.push("", "---", "", `## ${"Limits"}`, "", "No limits are available for this account.");
  } else {
    sections.push("", "---", "", `## ${"Limits"}`);
    for (const window of state.data.windows) sections.push("", usageWindowMarkdown(window));
  }

  const credits = creditsMarkdown(state.data.credits);
  if (credits) sections.push("", `### ${"Credits"}`, credits);

  const tokens = tokensMarkdown(state.data.tokens);
  if (tokens) sections.push("", "### Tokens", tokens);

  sections.push("", "---", "", `_${"Updated"} · ${dateFormatter.format(state.data.fetchedAt)}_`);
  return sections.join("\n");
}

function usageWindowMarkdown(window: UsageWindow): string {
  const rows = [
    `### ${window.title}`,
    "",
    `**${formatPercent(window.remainingPercent)} ${"remaining"}**`,
    "",
    progressBarMarkdown(window.remainingPercent),
  ];
  if (window.resetsAt) {
    rows.push("", `**${"Reset"}** · ${formatResetCompact(window.resetsAt)}`);
  }
  return rows.join("\n");
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
  return rows.length > 0 ? rows.join(" · ") : undefined;
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
  return rows.length > 0 ? rows.join(" · ") : undefined;
}

function plainUsageSummary(state: ProviderUsageState): string {
  if (!state.data) return state.error || "No usage data";
  const title = state.provider === "claude" ? "Claude" : "Codex";
  const windows = state.data.windows.map(
    (window) =>
      `${window.title}: ${formatPercent(window.remainingPercent)} ${"remaining"}${
        window.resetsAt ? `, ${"resets"} ${formatReset(window.resetsAt)}` : ""
      }`,
  );
  return [`${title} · ${planTitle(state.data.plan) || "Plan unavailable"}`, ...windows].join("\n");
}

function sourceLabel(state: ProviderUsageState): string {
  if (state.source === "live") return "Live";
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

function progressBarMarkdown(remainingPercent: number): string {
  const width = 640;
  const height = 14;
  const progressWidth = Math.round((clamp(remainingPercent, 0, 100) / 100) * width);
  const fill = remainingPercent <= 15 ? "#FF6262" : remainingPercent <= 35 ? "#F6C453" : "#58D49C";
  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
    `<rect width="${width}" height="${height}" rx="7" fill="#687080" opacity=".26"/>`,
    `<rect width="${progressWidth}" height="${height}" rx="7" fill="${fill}"/>`,
    "</svg>",
  ].join("");
  return `![${formatPercent(remainingPercent)}](data:image/svg+xml;base64,${Buffer.from(svg, "utf8").toString("base64")})`;
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
