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
import { useEffect, useMemo, useRef, useState } from "react";
import {
  budgetPeriodLabel,
  budgetRowTitle,
  budgetSpendForProvider,
  formatBudgetCapCompact,
  formatBudgetSpanLabel,
  getProviderBudgetAmount,
} from "./lib/budget";
import { getCodexBudgetLoadRange } from "./lib/codex-budget";
import { renderBudgetProgressMarkdown } from "./lib/budget-chart";
import {
  formatCurrencyMoney,
  formatTokens,
  getUsageLoadRange,
  PERIOD_KEYS,
  periodLabels,
  type PeriodKey,
} from "./lib/format";
import {
  renderTokenUsageChartMarkdown,
  type UsageBucket,
} from "./lib/token-chart";
import type { SourceProviderKey } from "./lib/types";
import { COST_COLOR, DATE_COLOR } from "./lib/ui-colors";
import { clearUsageSnapshotCache, loadUsage } from "./lib/usage";
import { UsageDetailsView } from "./usage-details";

const CURSOR_BRAND_HEX = "#A8DFB6";
const BUDGET_ITEM_ID = "budget";

type SelectionId = PeriodKey | typeof BUDGET_ITEM_ID;

const providersMeta: readonly {
  key: SourceProviderKey;
  title: string;
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

const periodListTitles: Record<PeriodKey, string> = {
  week: "Week",
  month: "Month",
};

const REFRESH_INTERVAL = 5 * 60_000;
const WARN_TITLE_MAX = 42;

const emptySummary = {
  totalTokens: 0,
  estimatedCost: 0,
  hasEstimatedTokens: false,
  hasEstimatedCost: false,
  buckets: [] as UsageBucket[],
};

function warningListTitle(text: string): string {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= WARN_TITLE_MAX ? t : `${t.slice(0, WARN_TITLE_MAX - 1)}…`;
}

function isCursorWarning(text: string): boolean {
  return text.startsWith("Cursor");
}

function usageAccentColor(pct: number, brandHex: string): Color.ColorLike {
  if (pct >= 0.9) return Color.Red;
  if (pct >= 0.6) return Color.Yellow;
  return brandHex;
}

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
  return `${Math.round(pct * 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}%`;
}

function isPeriodKey(id: string): id is PeriodKey {
  return PERIOD_KEYS.includes(id as PeriodKey);
}

export default function Command() {
  const prefs = getPreferenceValues<Preferences>();
  const currency = prefs.currency || "USD";
  const defaultSource: SourceProviderKey = providersMeta.some(
    (p) => p.key === prefs.defaultSource,
  )
    ? prefs.defaultSource
    : "claude";
  const [tab, setTab] = useState<SourceProviderKey>(defaultSource);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("week");
  const [selectedItemId, setSelectedItemId] = useState<SelectionId>("week");

  const { isLoading, data, revalidate } = useCachedPromise(
    (provider: SourceProviderKey) =>
      loadUsage(
        provider === "codex" ? getCodexBudgetLoadRange() : getUsageLoadRange(),
        provider,
      ),
    [tab],
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

  const activeProvider = providersMeta.find((p) => p.key === tab)!;
  const nativeBudget = getProviderBudgetAmount(prefs, tab);
  const errors = data?.errors ?? [];

  const budgetSpend = budgetSpendForProvider(
    tab,
    data?.periods ?? { week: emptySummary, month: emptySummary },
    data?.codexBudget,
  );
  const budgetPct = nativeBudget > 0 ? budgetSpend / nativeBudget : 0;
  const budgetSpendStr = formatCurrencyMoney(budgetSpend, currency);
  const budgetCapStr = formatCurrencyMoney(nativeBudget, currency);
  const budgetCapCompact = formatBudgetCapCompact(nativeBudget, currency);
  const budgetPairLabel = `${budgetSpendStr} / ${budgetCapStr}`;
  const budgetTooltip = `${formatBudgetPercent(budgetPct)} of ${budgetRowTitle(tab).toLowerCase()} (${budgetPairLabel})`;
  const remaining = Math.max(nativeBudget - budgetSpend, 0);

  const selectedChartMarkdown = useMemo(() => {
    const snapshot = data?.periods[selectedPeriod];
    if (!snapshot) return "";
    return renderTokenUsageChartMarkdown(
      selectedPeriod,
      snapshot.buckets,
      activeProvider.brandColor,
    );
  }, [data, selectedPeriod, activeProvider.brandColor]);

  const budgetBarFill =
    budgetPct >= 0.9
      ? "#FF453A"
      : budgetPct >= 0.6
        ? "#FFD60A"
        : activeProvider.brandColor;
  const budgetDetailMarkdown = renderBudgetProgressMarkdown(
    budgetSpend,
    nativeBudget,
    currency,
    budgetBarFill,
  );

  const handleRefresh = () => {
    clearUsageSnapshotCache();
    revalidate();
  };

  const refreshAction = (
    <ActionPanel>
      <Action
        title="Refresh Data"
        icon={Icon.ArrowClockwise}
        onAction={handleRefresh}
      />
    </ActionPanel>
  );

  return (
    <List
      isShowingDetail
      isLoading={isLoading}
      filtering={false}
      searchBarPlaceholder=""
      selectedItemId={selectedItemId}
      onSelectionChange={(id) => {
        if (!id) return;
        if (id === BUDGET_ITEM_ID) {
          setSelectedItemId(BUDGET_ITEM_ID);
          return;
        }
        if (isPeriodKey(id)) {
          setSelectedItemId(id);
          setSelectedPeriod(id);
        }
      }}
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
        {PERIOD_KEYS.map((period) => {
          const snapshot = data?.periods[period] ?? emptySummary;
          const chartMarkdown =
            period === selectedPeriod ? selectedChartMarkdown : "";

          const spendStr = formatCurrencyMoney(
            snapshot.estimatedCost,
            currency,
          );
          const tokensStr =
            snapshot.totalTokens > 0
              ? formatTokens(snapshot.totalTokens)
              : undefined;

          const hasCost = snapshot.estimatedCost > 0;
          const periodAccessories = [
            ...(hasCost
              ? [
                  {
                    text: { value: spendStr, color: COST_COLOR },
                    tooltip: `Estimated cost · ${spendStr}`,
                  },
                ]
              : []),
            ...(tokensStr
              ? [{ text: tokensStr, tooltip: `${tokensStr} tokens` }]
              : []),
          ];

          return (
            <List.Item
              id={period}
              key={period}
              title={{
                value: periodListTitles[period],
                tooltip: periodLabels[period],
              }}
              subtitle={
                !hasCost && tokensStr
                  ? { value: tokensStr, tooltip: tokensStr }
                  : undefined
              }
              accessories={periodAccessories}
              detail={
                <List.Item.Detail
                  markdown={chartMarkdown}
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Period"
                        text={periodLabels[period]}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Total Tokens"
                        text={formatTokens(snapshot.totalTokens)}
                      />
                      <List.Item.Detail.Metadata.Label
                        title="Estimated Cost"
                        text={{ value: spendStr, color: COST_COLOR }}
                      />
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
                        provider={tab}
                        providerTitle={activeProvider.title}
                        currency={currency}
                      />
                    }
                  />
                  <Action
                    title="Refresh Data"
                    icon={Icon.ArrowClockwise}
                    onAction={handleRefresh}
                  />
                </ActionPanel>
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Budget" subtitle={budgetPeriodLabel(tab)}>
        <List.Item
          id={BUDGET_ITEM_ID}
          title={budgetRowTitle(tab)}
          accessories={[
            {
              text: { value: budgetSpendStr, color: COST_COLOR },
              tooltip: `Spent · ${budgetSpendStr}`,
            },
            {
              text: `/ ${budgetCapCompact}`,
              tooltip: `Budget cap · ${budgetCapStr}`,
            },
            {
              icon: {
                source: budgetProgressIcon(budgetPct),
                tintColor: usageAccentColor(
                  budgetPct,
                  activeProvider.brandColor,
                ),
              },
              tooltip: budgetTooltip,
            },
          ]}
          detail={
            <List.Item.Detail
              markdown={budgetDetailMarkdown}
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label
                    title="Period"
                    text={budgetPeriodLabel(tab)}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Span"
                    text={{
                      value: formatBudgetSpanLabel(tab, data?.codexBudget),
                      color: DATE_COLOR,
                    }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Remaining"
                    text={{
                      value: formatCurrencyMoney(remaining, currency),
                      color: COST_COLOR,
                    }}
                  />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
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
