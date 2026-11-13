import { Action, ActionPanel, environment, List } from "@raycast/api";
import { useMemo } from "react";
import { renderMonthlyBars } from "../charts/bars";
import type { ChangeSegment } from "../charts/change-line";
import { headlineChartMarkdown, headlineMarkdown } from "../charts/headline";
import { DETAIL_CHART_WIDTH } from "../charts/svg";
import type { Appearance } from "../charts/theme";
import { directionOf, formatMoney, formatNumber, formatPct, formatPrice } from "../lib/format";
import { groupByMonth, humanizeEnum, summarizeDividends, type DividendSummary } from "../lib/history";
import { shortTicker } from "../lib/portfolio";
import type { DividendItem } from "../lib/t212/types";
import { ICONS } from "./icons";
import { COPY_SHORTCUT, formatDate, HISTORY_CHART_HEIGHT, OpenInTrading212Action, RefreshAction } from "./shared";

function SummaryDetail({
  summary,
  currency,
  appearance,
}: {
  summary: DividendSummary;
  currency: string;
  appearance: Appearance;
}) {
  const change: ChangeSegment[] | undefined =
    summary.changePct === null
      ? undefined
      : [
          {
            text: formatPct(summary.changePct, { signed: true, decimals: 0 }),
            tone: directionOf(summary.changePct),
          },
          { text: " vs prior 12 months" },
        ];
  const svg = renderMonthlyBars(summary.months, {
    width: DETAIL_CHART_WIDTH,
    height: HISTORY_CHART_HEIGHT,
    appearance,
    currency,
    // Older payouts exist when the all-time total isn't zero, so "yet" would be wrong.
    emptyMessage: summary.allTime > 0 ? "No dividends in the last 12 months" : "No dividends yet",
  });
  const top = summary.topPayer;
  const markdown = [
    headlineChartMarkdown(
      { label: "Dividends · last 12 months", amount: formatMoney(summary.last12, currency), change },
      svg,
      HISTORY_CHART_HEIGHT,
      appearance,
      "Dividends per month",
      [
        { label: "This year", value: formatMoney(summary.thisYear, currency) },
        { label: "All time", value: formatMoney(summary.allTime, currency) },
        { label: "Monthly avg", value: formatMoney(summary.monthlyAvg, currency) },
        {
          label: "Top payer",
          value: top ? `${shortTicker(top.ticker)} ${formatMoney(top.amount, currency, { decimals: 0 })}` : "—",
        },
      ],
    ),
  ].join("\n\n");
  return <List.Item.Detail markdown={markdown} />;
}

function PayoutDetail({ item }: { item: DividendItem }) {
  const name = item.instrument?.name || shortTicker(item.ticker);
  const amount = formatMoney(item.amount, item.currency, { signed: true });
  const markdown = headlineMarkdown(
    { label: `${name} · ${shortTicker(item.ticker)}`, amount },
    environment.appearance,
    amount,
    [
      { label: "Shares", value: formatNumber(item.quantity) },
      {
        label: "Per share",
        value: formatPrice(item.grossAmountPerShare, item.tickerCurrency ?? item.instrument?.currency),
      },
      { label: "Amount", value: formatMoney(item.amount, item.currency) },
      { label: "Paid on", value: formatDate(item.paidOn, { utc: true }) },
      { label: "Type", value: item.type ? humanizeEnum(item.type) : "—" },
    ],
  );
  return <List.Item.Detail markdown={markdown} />;
}

export function DividendItems({
  items,
  appearance,
  onRefresh,
}: {
  items: DividendItem[];
  appearance: Appearance;
  onRefresh: () => void;
}) {
  const summary = useMemo(() => summarizeDividends(items, new Date()), [items]);
  const groups = useMemo(() => groupByMonth(items, (d) => d.paidOn), [items]);
  if (items.length === 0) return null;
  const currency = items[0].currency;

  return (
    <>
      <List.Item
        id="all-dividends"
        icon={ICONS.dividends}
        title="All Dividends"
        accessories={[{ text: formatMoney(summary.allTime, currency, { decimals: 0 }) }]}
        detail={<SummaryDetail summary={summary} currency={currency} appearance={appearance} />}
        actions={
          <ActionPanel>
            <OpenInTrading212Action />
            <RefreshAction onRefresh={onRefresh} />
          </ActionPanel>
        }
      />
      {groups.map((group) => (
        <List.Section key={group.key} title={group.label}>
          {group.items.map((d) => {
            const short = shortTicker(d.ticker);
            return (
              <List.Item
                key={d.reference}
                id={d.reference}
                title={short}
                keywords={d.instrument?.name ? [d.instrument.name] : undefined}
                accessories={[{ text: formatMoney(d.amount, d.currency, { signed: true }) }]}
                detail={<PayoutDetail item={d} />}
                actions={
                  <ActionPanel>
                    <OpenInTrading212Action />
                    <Action.CopyToClipboard title="Copy Ticker" content={short} shortcut={COPY_SHORTCUT} />
                    <RefreshAction onRefresh={onRefresh} />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </>
  );
}
