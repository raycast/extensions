import { List } from "@raycast/api";
import { headlineChartMarkdown } from "../charts/headline";
import { renderPriceChart } from "../charts/price-line";
import { DETAIL_CHART_WIDTH, svgDocument } from "../charts/svg";
import type { Appearance } from "../charts/theme";
import { directionOf, formatMoney, formatNumber, formatPct } from "../lib/format";
import { sessionWeekday, shortTicker, type PositionView } from "../lib/portfolio";
import type { ChartRange, PriceSeries } from "../lib/yahoo/chart";

const PRICE_CHART_HEIGHT = 190;

interface Props {
  position: PositionView;
  accountCurrency: string;
  symbol: string | null;
  series: PriceSeries | undefined;
  isLoading: boolean;
  range: ChartRange;
  appearance: Appearance;
}

function chartSvg({ position, symbol, series, isLoading, range, appearance }: Props): string {
  const size = { width: DETAIL_CHART_WIDTH, height: PRICE_CHART_HEIGHT };
  // While the first load is in flight keep the chart's space so the pane doesn't jump.
  if (symbol !== null && !series && isLoading) return svgDocument("", size.width, size.height);
  return renderPriceChart(series?.points ?? [], {
    ...size,
    appearance,
    range,
    currency: series?.currency ?? position.priceCurrency,
    avgPrice: series && series.currency === position.priceCurrency ? position.avgPrice : undefined,
  });
}

function positionMarkdown(props: Props): string {
  const { position, symbol, series, accountCurrency, appearance } = props;
  const subtitle = [position.name, symbol ?? shortTicker(position.ticker), series?.exchangeName]
    .filter((part): part is string => Boolean(part))
    .join(" · ");
  const price = formatMoney(position.currentPrice, position.priceCurrency);
  const session = sessionWeekday(position.todayAsOf, Date.now()) ?? "today";
  const change =
    symbol !== null && position.todayPct !== null
      ? [
          { text: formatPct(position.todayPct, { signed: true }), tone: directionOf(position.todayPct) },
          { text: ` ${session}` },
        ]
      : undefined;
  return headlineChartMarkdown(
    { label: subtitle, amount: price, change },
    chartSvg(props),
    PRICE_CHART_HEIGHT,
    appearance,
    "Price chart",
    [
      { label: "Value", value: formatMoney(position.value, accountCurrency) },
      {
        label: "Return",
        value: `${formatMoney(position.returnAmount, accountCurrency, { signed: true })} · ${formatPct(position.returnPct, { signed: true })}`,
        tone: directionOf(position.returnPct),
      },
      { label: "Shares", value: formatNumber(position.quantity) },
      { label: "Avg price", value: formatMoney(position.avgPrice, position.priceCurrency) },
      { label: "Of portfolio", value: formatPct(position.weightPct) },
      { label: "Held since", value: formatHeldSince(position.heldSince) },
    ],
  );
}

function formatHeldSince(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(date);
}

export function PositionDetail(props: Props) {
  return <List.Item.Detail isLoading={props.isLoading} markdown={positionMarkdown(props)} />;
}
