import {
  Action,
  ActionPanel,
  Color,
  Icon,
  LaunchProps,
  List,
  getPreferenceValues,
  openExtensionPreferences,
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
import { computeBudgetPace } from "./lib/budget-pace";
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
import { PROVIDERS } from "./lib/provider-meta";
import type { SourceProviderKey } from "./lib/types";
import { COST_COLOR, DATE_COLOR } from "./lib/ui-colors";
import { clearUsageSnapshotCache, loadUsage } from "./lib/usage";
import { UsageDetailsView } from "./usage-details";

const BUDGET_ITEM_ID = "budget";
const BUDGET_PACE_ITEM_ID = "budget-pace";

type SelectionId =
  | PeriodKey
  | typeof BUDGET_ITEM_ID
  | typeof BUDGET_PACE_ITEM_ID;

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

const CURSOR_BRAND_HEX =
  PROVIDERS.find((p) => p.key === "cursor")?.brandColor ?? "#A8DFB6";

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

function resolveInitialProvider(
  prefs: Preferences,
  launchProvider?: SourceProviderKey,
): SourceProviderKey {
  if (launchProvider && PROVIDERS.some((p) => p.key === launchProvider)) {
    return launchProvider;
  }
  return PROVIDERS.some((p) => p.key === prefs.defaultSource)
    ? prefs.defaultSource
    : "claude";
}

export default function Command(
  props: LaunchProps<{ launchContext?: { provider?: SourceProviderKey } }>,
) {
  const prefs = getPreferenceValues<Preferences>();
  const currency = prefs.currency || "USD";
  const [tab, setTab] = useState<SourceProviderKey>(() =>
    resolveInitialProvider(prefs, props.launchContext?.provider),
  );
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodKey>("week");
  const [selectedItemId, setSelectedItemId] = useState<SelectionId>("week");

  const { isLoading, data, revalidate } = useCachedPromise(
    (provider: SourceProviderKey) =>
      loadUsage(
        provider === "codex" ? getCodexBudgetLoadRange() : getUsageLoadRange(),
        provider,
      ),
    [tab],
    { keepPreviousData: true },
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

  const activeProvider = PROVIDERS.find((p) => p.key === tab)!;
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
  const remainingStr = formatCurrencyMoney(remaining, currency);
  const budgetPace = computeBudgetPace(
    tab,
    budgetSpend,
    nativeBudget,
    currency,
    data?.codexBudget,
  );

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

  const budgetDetailMetadata = (
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
          value: remainingStr,
          color: COST_COLOR,
        }}
      />
    </List.Item.Detail.Metadata>
  );

  const budgetPaceDetailMetadata = (
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
      {budgetPace.dailyBurn ? (
        <List.Item.Detail.Metadata.Label
          title="Daily Burn"
          text={{ value: budgetPace.dailyBurn, color: COST_COLOR }}
        />
      ) : null}
      {budgetPace.dailyAllowance ? (
        <List.Item.Detail.Metadata.Label
          title="Daily Allowance"
          text={{ value: budgetPace.dailyAllowance, color: COST_COLOR }}
        />
      ) : null}
      {budgetPace.projection ? (
        <List.Item.Detail.Metadata.Label
          title="Projection"
          text={{
            value: budgetPace.projection,
            color: DATE_COLOR,
          }}
        />
      ) : null}
      {budgetPace.status === "under_pace" && budgetPace.subtitle ? (
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={budgetPace.subtitle}
        />
      ) : null}
      {!budgetPace.dailyBurn && budgetPace.title ? (
        <List.Item.Detail.Metadata.Label title="Pace" text={budgetPace.title} />
      ) : null}
    </List.Item.Detail.Metadata>
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
      <Action
        title="Open Extension Preferences"
        icon={Icon.Gear}
        onAction={openExtensionPreferences}
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
        if (id === BUDGET_ITEM_ID || id === BUDGET_PACE_ITEM_ID) {
          setSelectedItemId(id);
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
          {PROVIDERS.map((p) => (
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
                  <Action
                    title="Open Extension Preferences"
                    icon={Icon.Gear}
                    onAction={openExtensionPreferences}
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
              metadata={budgetDetailMetadata}
            />
          }
        />
        <List.Item
          id={BUDGET_PACE_ITEM_ID}
          title="Pace"
          subtitle={
            budgetPace.listHint
              ? {
                  value: budgetPace.listHint,
                  tooltip: budgetPace.subtitle ?? budgetPace.title,
                }
              : undefined
          }
          accessories={
            budgetPace.listBurn
              ? [
                  {
                    text: {
                      value: budgetPace.listBurn,
                      color: COST_COLOR,
                    },
                    tooltip: budgetPace.title,
                  },
                ]
              : []
          }
          detail={<List.Item.Detail metadata={budgetPaceDetailMetadata} />}
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
