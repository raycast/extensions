import { Action, ActionPanel, Color, environment, Icon, launchCommand, LaunchType, List } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useMemo } from "react";
import type { Figure, FigureTone } from "../charts/figures";
import { headlineMarkdown } from "../charts/headline";
import { directionOf, formatMoney, formatNumber, formatPct } from "../lib/format";
import { groupByMonth, orderHeadline, orderTypeLabel, orderView, type OrderView } from "../lib/history";
import { shortTicker } from "../lib/portfolio";
import type { HistoricalOrder } from "../lib/t212/types";
import { COPY_SHORTCUT, formatDate, OpenInTrading212Action, RefreshAction } from "./shared";

const STATUS_COLOR: Record<OrderView["status"], Color> = {
  filled: Color.Green,
  cancelled: Color.SecondaryText,
  rejected: Color.Red,
  pending: Color.Yellow,
};

const STATUS_TONE: Record<OrderView["status"], FigureTone> = {
  filled: "up",
  cancelled: "muted",
  rejected: "down",
  pending: "warning",
};

function OrderDetail({ order, view }: { order: HistoricalOrder; view: OrderView }) {
  const short = shortTicker(order.order.ticker);
  const walletCurrency = order.fill?.walletImpact?.currency;
  const figures: Figure[] = [
    { label: "Total", value: view.total !== null && walletCurrency ? formatMoney(view.total, walletCurrency) : "—" },
    {
      label: "Shares",
      value: view.shares !== null ? formatNumber(view.shares) : "—",
    },
    { label: "Fill price", value: view.fillPrice ? formatMoney(view.fillPrice.price, view.fillPrice.currency) : "—" },
    ...(walletCurrency ? [{ label: "Fees & taxes", value: formatMoney(view.fees, walletCurrency) }] : []),
    { label: "Status", value: view.statusLabel, tone: STATUS_TONE[view.status] },
    ...(view.sinceThenPct !== null
      ? [
          {
            label: "Since then",
            value: formatPct(view.sinceThenPct, { signed: true }),
            tone: directionOf(view.sinceThenPct),
          },
        ]
      : []),
  ];
  const markdown = headlineMarkdown(
    {
      label: `${orderTypeLabel(order.order.type, order.order.side)} · ${formatDate(view.date, { time: true })}`,
      amount: orderHeadline(view, short),
      change: view.fillPrice
        ? [{ text: `at ${formatMoney(view.fillPrice.price, view.fillPrice.currency)} per share` }]
        : undefined,
    },
    environment.appearance,
    orderHeadline(view, short),
    figures,
  );
  return <List.Item.Detail markdown={markdown} />;
}

function showInPortfolio(ticker: string) {
  launchCommand({ name: "portfolio", type: LaunchType.UserInitiated, context: { ticker } }).catch((err: unknown) =>
    showFailureToast(err, { title: "Couldn't open Portfolio" }),
  );
}

export function OrderItems({
  orders,
  currentPrices,
  onRefresh,
}: {
  orders: HistoricalOrder[];
  /** Held positions by Trading 212 ticker; empty while the portfolio isn't loaded. */
  currentPrices: Record<string, { price: number; currency: string }>;
  onRefresh: () => void;
}) {
  const rows = useMemo(
    () => orders.map((order) => ({ order, view: orderView(order, currentPrices) })),
    [orders, currentPrices],
  );
  const groups = useMemo(() => groupByMonth(rows, (r) => r.view.date), [rows]);

  return groups.map((group) => (
    <List.Section key={group.key} title={group.label}>
      {group.items.map(({ order, view }) => {
        const { ticker } = order.order;
        const short = shortTicker(ticker);
        const name = order.order.instrument?.name;
        const held = Object.hasOwn(currentPrices, ticker);
        return (
          <List.Item
            key={order.order.id}
            id={String(order.order.id)}
            title={view.title}
            keywords={[short, ticker, ...(name ? [name] : [])]}
            accessories={[{ text: { value: view.statusLabel, color: STATUS_COLOR[view.status] } }]}
            detail={<OrderDetail order={order} view={view} />}
            actions={
              <ActionPanel>
                {held && (
                  <Action
                    title={`Show ${short} in Portfolio`}
                    icon={Icon.PieChart}
                    onAction={() => showInPortfolio(ticker)}
                  />
                )}
                <OpenInTrading212Action />
                <Action.CopyToClipboard title="Copy Ticker" content={short} shortcut={COPY_SHORTCUT} />
                <RefreshAction onRefresh={onRefresh} />
              </ActionPanel>
            }
          />
        );
      })}
    </List.Section>
  ));
}
