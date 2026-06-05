import {
  Action,
  ActionPanel,
  Color,
  Icon,
  Image,
  List,
  getPreferenceValues,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useEffect, useRef, useState } from "react";
import { loadUsage } from "./lib/usage";
import {
  formatCurrencyMoney,
  formatTokens,
  getUsageLoadRange,
  periodLabels,
  type PeriodKey,
} from "./lib/format";
import {
  renderTokenUsageChartMarkdown,
  type UsageBucket,
} from "./lib/token-chart";
import {
  deserializeConversation,
  supportsConversationDetailsFromSnapshot,
} from "./lib/usage-snapshot";
import type { SourceProviderKey } from "./lib/types";
import { UsageDetailsView } from "./usage-details";

/* ------------------------------------------------------------------ */
/*  Provider metadata (brand marks via assets/)                         */
/* ------------------------------------------------------------------ */

/** Cursor UI accent — very light green so it reads apart from Claude’s orange. */
const CURSOR_BRAND_HEX = "#C8F4CE";

const providersMeta: readonly {
  key: SourceProviderKey;
  title: string;
  /** Hex accent for healthy usage, charts, and icon tints (Raycast accepts hex strings). */
  brandColor: string;
  dropdownIcon: Image.ImageLike;
}[] = [
  {
    key: "claude",
    title: "Claude Code",
    brandColor: "#D97757",
    dropdownIcon: "provider-claude.png",
  },
  {
    key: "codex",
    title: "Codex",
    brandColor: "#2D8EFF",
    dropdownIcon: "provider-codex.png",
  },
  {
    key: "cursor",
    title: "Cursor",
    brandColor: CURSOR_BRAND_HEX,
    dropdownIcon: "provider-cursor.png",
  },
];

const periods: PeriodKey[] = ["today", "week", "month"];

/** Short period names for the list title (full label in tooltip & detail). */
const periodListTitles: Record<PeriodKey, string> = {
  today: "Today",
  week: "Week",
  month: "Month",
};

/** Auto-refresh interval — full corpus rescans are expensive; 5 min keeps heap stable. */
const REFRESH_INTERVAL = 5 * 60_000;

/** Raycast list rows clip long titles; keep a single line with full detail on hover. */
const WARN_TITLE_MAX = 42;

function warningListTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= WARN_TITLE_MAX ? t : `${t.slice(0, WARN_TITLE_MAX - 1)}…`;
}

function isCursorWarning(text: string): boolean {
  return text.startsWith("Cursor");
}

/* ------------------------------------------------------------------ */
/*  Budget helpers                                                    */
/* ------------------------------------------------------------------ */

/** Claude + Cursor: limits align with calendar-ish monthly totals; sub-periods are even splits for planning. */
function deriveBudgetsFromMonthly(monthly: number): Record<PeriodKey, number> {
  return {
    month: monthly,
    week: monthly / 4,
    today: monthly / 30,
  };
}

/** Codex: OpenAI’s published limits center on 5h + weekly; user cap is weekly; month ≈ 30/7 weeks. */
function deriveBudgetsFromWeekly(weekly: number): Record<PeriodKey, number> {
  return {
    week: weekly,
    month: weekly * (30 / 7),
    today: weekly / 7,
  };
}

function getProviderBudgetAmount(
  prefs: Preferences,
  provider: SourceProviderKey,
): number {
  const raw =
    provider === "claude"
      ? prefs.claudeBudget
      : provider === "codex"
        ? prefs.codexBudget
        : prefs.cursorBudget;
  const val = Number(raw);
  return Number.isFinite(val) && val > 0 ? val : 0;
}

function budgetsForProvider(
  prefs: Preferences,
  provider: SourceProviderKey,
): Record<PeriodKey, number> | null {
  const amount = getProviderBudgetAmount(prefs, provider);
  if (amount <= 0) return null;
  if (provider === "codex") return deriveBudgetsFromWeekly(amount);
  return deriveBudgetsFromMonthly(amount);
}

/* ------------------------------------------------------------------ */
/*  Budget visuals (Raycast circle progress icons)                    */
/* ------------------------------------------------------------------ */

function usageAccentColor(pct: number, brandHex: string): Color.ColorLike {
  if (pct >= 0.9) return Color.Red;
  if (pct >= 0.6) return Color.Yellow;
  return brandHex;
}

/** Maps usage (share of period budget) to Raycast's discrete circle icons (25 / 50 / 75 / 100 — not a continuous arc). */
function budgetProgressIcon(pct: number): Icon {
  if (!Number.isFinite(pct) || pct <= 0) return Icon.Circle;
  const p = Math.min(pct, 1);
  if (p >= 0.99) return Icon.CircleProgress100;
  if (p >= 0.75) return Icon.CircleProgress75;
  if (p >= 0.5) return Icon.CircleProgress50;
  if (p >= 0.25) return Icon.CircleProgress25;
  return Icon.Circle;
}

function formatBudgetPercent(pct: number): string {
  if (!Number.isFinite(pct) || pct <= 0) return "0%";
  const whole = Math.round(pct * 100);
  return `${whole.toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;
}

/* ------------------------------------------------------------------ */
/*  Command                                                           */
/* ------------------------------------------------------------------ */

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const currency = prefs.currency || "USD";
  const defaultSource: SourceProviderKey = providersMeta.some(
    (p) => p.key === prefs.defaultSource,
  )
    ? prefs.defaultSource
    : "claude";
  const [tab, setTab] = useState<SourceProviderKey>(defaultSource);

  const { isLoading, data, revalidate } = useCachedPromise(
    async (provider: SourceProviderKey) =>
      loadUsage(prefs, getUsageLoadRange(), provider),
    [tab],
    { keepPreviousData: false },
  );

  const intervalRef = useRef<ReturnType<typeof setInterval> | undefined>(
    undefined,
  );
  useEffect(() => {
    intervalRef.current = setInterval(() => revalidate(), REFRESH_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [revalidate]);

  const errors = data?.errors ?? [];
  const activeProvider = providersMeta.find((p) => p.key === tab)!;
  const budgets = budgetsForProvider(prefs, tab);

  const refreshAction = (
    <ActionPanel>
      <Action
        title="Refresh Data"
        icon={Icon.ArrowClockwise}
        onAction={() => revalidate()}
      />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder=""
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Provider"
          value={tab}
          onChange={(v) => setTab(v as SourceProviderKey)}
        >
          {providersMeta.map((p) => (
            <List.Dropdown.Item
              key={p.key}
              title={p.title}
              value={p.key}
              icon={p.dropdownIcon}
            />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section title="Usage">
        {periods.map((period) => {
          const snapshot = data?.periods[period];
          const summary = snapshot ?? {
            totalTokens: 0,
            estimatedCost: 0,
            hasEstimatedTokens: false,
            hasEstimatedCost: false,
            buckets: [] as UsageBucket[],
            conversations: [],
          };
          const budget = budgets ? budgets[period] : undefined;
          const chartMarkdown = renderTokenUsageChartMarkdown(
            period,
            summary.buckets,
            activeProvider.brandColor,
          );
          const detailsAvailable = snapshot
            ? supportsConversationDetailsFromSnapshot(tab, snapshot)
            : false;
          const conversations = summary.conversations.map(
            deserializeConversation,
          );

          const pct = budget && budget > 0 ? summary.estimatedCost / budget : 0;
          const hasBudget = budget !== undefined && budget > 0;

          const spendStr = formatCurrencyMoney(summary.estimatedCost, currency);
          const budgetStr = budget ? formatCurrencyMoney(budget, currency) : "";
          const budgetTooltip = hasBudget
            ? `${formatBudgetPercent(pct)} of period budget (${spendStr} / ${budgetStr})`
            : undefined;

          const subtitleValue = hasBudget
            ? `${spendStr} / ${budgetStr}`
            : summary.estimatedCost > 0
              ? spendStr
              : summary.totalTokens > 0
                ? formatTokens(summary.totalTokens)
                : undefined;

          return (
            <List.Item
              key={period}
              title={{
                value: periodListTitles[period],
                tooltip: periodLabels[period],
              }}
              subtitle={
                subtitleValue
                  ? {
                      value: subtitleValue,
                      tooltip: hasBudget ? budgetTooltip : undefined,
                    }
                  : undefined
              }
              accessories={
                hasBudget
                  ? [
                      {
                        icon: {
                          source: budgetProgressIcon(pct),
                          tintColor: usageAccentColor(
                            pct,
                            activeProvider.brandColor,
                          ),
                        },
                        tooltip: budgetTooltip,
                      },
                    ]
                  : []
              }
              detail={
                <List.Item.Detail
                  markdown={chartMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Period"
                        text={periodLabels[period]}
                        icon={{
                          source: Icon.Calendar,
                          tintColor: activeProvider.brandColor,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Tokens"
                        text={formatTokens(summary.totalTokens)}
                        icon={{
                          source: Icon.TextDocument,
                          tintColor: activeProvider.brandColor,
                        }}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Estimated Cost"
                        text={spendStr}
                        icon={{
                          source: Icon.CreditCard,
                          tintColor: activeProvider.brandColor,
                        }}
                      />
                      {hasBudget ? (
                        <List.Item.Detail.Metadata.TagList title="Usage">
                          <List.Item.Detail.Metadata.TagList.Item
                            icon={{
                              source: budgetProgressIcon(pct),
                              tintColor: usageAccentColor(
                                pct,
                                activeProvider.brandColor,
                              ),
                            }}
                            text={formatBudgetPercent(pct)}
                            color={usageAccentColor(
                              pct,
                              activeProvider.brandColor,
                            )}
                          />
                        </List.Item.Detail.Metadata.TagList>
                      ) : null}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
              actions={
                <ActionPanel>
                  <Action.Push
                    title="View Details"
                    icon={Icon.List}
                    target={
                      <UsageDetailsView
                        period={period}
                        providerTitle={activeProvider.title}
                        currency={currency}
                        conversations={conversations}
                        unavailableReason={
                          detailsAvailable
                            ? undefined
                            : tab === "cursor"
                              ? "Not available for Cursor."
                              : "No per-chat breakdown is available for this period."
                        }
                      />
                    }
                  />
                  <Action
                    title="Refresh Data"
                    icon={Icon.ArrowClockwise}
                    onAction={() => revalidate()}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      {errors.length > 0 ? (
        <List.Section title="Warnings">
          {errors.map((err: string, i: number) => (
            <List.Item
              key={`err-${i}`}
              title={{ value: warningListTitle(err), tooltip: err }}
              icon={{
                source: Icon.Warning,
                tintColor: isCursorWarning(err)
                  ? CURSOR_BRAND_HEX
                  : Color.Yellow,
              }}
              actions={refreshAction}
            />
          ))}
        </List.Section>
      ) : null}
    </List>
  );
}
