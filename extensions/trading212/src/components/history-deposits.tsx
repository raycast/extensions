import { Action, ActionPanel, environment, List, type Image } from "@raycast/api";
import { useMemo } from "react";
import type { ChangeSegment } from "../charts/change-line";
import { renderDepositBars } from "../charts/deposit-bars";
import { headlineChartMarkdown, headlineMarkdown } from "../charts/headline";
import { DETAIL_CHART_WIDTH } from "../charts/svg";
import type { Appearance } from "../charts/theme";
import { formatMoney } from "../lib/format";
import {
  buildTransactionRows,
  groupByMonth,
  summarizeDeposits,
  txRowSignedAmount,
  txRowTitle,
  type DepositSummary,
  type TxRow,
} from "../lib/history";
import type { TransactionItem } from "../lib/t212/types";
import { ICONS } from "./icons";
import { formatDate, HISTORY_CHART_HEIGHT, OpenInTrading212Action, RefreshAction } from "./shared";

const ROW_ICONS: Record<TxRow["kind"], Image.ImageLike> = {
  deposit: ICONS.deposit,
  withdrawal: ICONS.withdrawal,
  fee: ICONS.fee,
  "transfer-in": ICONS.deposit,
  "transfer-out": ICONS.withdrawal,
  interest: ICONS.interest,
};

function SummaryDetail({
  summary,
  currency,
  totalBalance,
  appearance,
}: {
  summary: DepositSummary;
  currency: string;
  /** Today's portfolio value in `currency`; null while the portfolio isn't loaded. */
  totalBalance: number | null;
  appearance: Appearance;
}) {
  const svg = renderDepositBars(summary.months, {
    width: DETAIL_CHART_WIDTH,
    height: HISTORY_CHART_HEIGHT,
    appearance,
    currency,
  });
  let worth: ChangeSegment[] | undefined;
  if (totalBalance !== null) {
    const diff = totalBalance - summary.netDeposited;
    const amount = formatMoney(Math.abs(diff), currency, { decimals: 0 });
    worth = [
      { text: "Portfolio is worth " },
      { text: `${amount} ${diff >= 0 ? "more" : "less"}`, tone: diff >= 0 ? "up" : "down" },
      { text: " than you put in" },
    ];
  }
  const markdown = [
    headlineChartMarkdown(
      { label: "Money in, minus money out", amount: formatMoney(summary.netDeposited, currency), change: worth },
      svg,
      HISTORY_CHART_HEIGHT,
      appearance,
      "Net deposits over time",
      [
        { label: "Deposited", value: formatMoney(summary.deposited, currency) },
        { label: "Withdrawn", value: formatMoney(summary.withdrawn, currency) },
        { label: "This year", value: formatMoney(summary.thisYear, currency) },
        { label: "Fees", value: formatMoney(summary.fees, currency) },
        { label: "Interest earned", value: formatMoney(summary.interest, currency) },
      ],
    ),
  ].join("\n\n");
  return <List.Item.Detail markdown={markdown} />;
}

function RowDetail({ row, currency }: { row: TxRow; currency: string }) {
  const amount = formatMoney(txRowSignedAmount(row), currency, { signed: true });
  const markdown = headlineMarkdown(
    { label: txRowTitle(row), amount },
    environment.appearance,
    amount,
    row.kind === "interest"
      ? [
          { label: "Payments", value: String(row.count) },
          { label: "Last paid", value: formatDate(row.date) },
        ]
      : [
          { label: "Date", value: formatDate(row.date, { time: true }) },
          { label: "Reference", value: row.reference },
        ],
  );
  return <List.Item.Detail markdown={markdown} />;
}

export function TransactionItems({
  items,
  totalBalance,
  appearance,
  onRefresh,
}: {
  items: TransactionItem[];
  totalBalance: { value: number; currency: string } | null;
  appearance: Appearance;
  onRefresh: () => void;
}) {
  const summary = useMemo(() => summarizeDeposits(items, new Date()), [items]);
  const groups = useMemo(() => groupByMonth(buildTransactionRows(items), (r) => r.date), [items]);
  if (items.length === 0) return null;
  const currency = items[0].currency;
  const balance = totalBalance && totalBalance.currency === currency ? totalBalance.value : null;
  const actions = (
    <ActionPanel>
      <OpenInTrading212Action />
      <RefreshAction onRefresh={onRefresh} />
    </ActionPanel>
  );

  return (
    <>
      <List.Item
        id="net-deposited"
        icon={ICONS.netDeposited}
        title="Net Deposited"
        accessories={[{ text: formatMoney(summary.netDeposited, currency, { decimals: 0 }) }]}
        detail={<SummaryDetail summary={summary} currency={currency} totalBalance={balance} appearance={appearance} />}
        actions={actions}
      />
      {groups.map((group) => (
        <List.Section key={group.key} title={group.label}>
          {group.items.map((row) => {
            const id = row.kind === "interest" ? `interest-${row.month}` : row.reference;
            return (
              <List.Item
                key={id}
                id={id}
                icon={ROW_ICONS[row.kind]}
                title={txRowTitle(row)}
                accessories={[{ text: formatMoney(txRowSignedAmount(row), currency, { signed: true }) }]}
                detail={<RowDetail row={row} currency={currency} />}
                actions={
                  row.kind === "interest" ? (
                    actions
                  ) : (
                    <ActionPanel>
                      <OpenInTrading212Action />
                      <Action.CopyToClipboard title="Copy Reference" content={row.reference} />
                      <RefreshAction onRefresh={onRefresh} />
                    </ActionPanel>
                  )
                }
              />
            );
          })}
        </List.Section>
      ))}
    </>
  );
}
