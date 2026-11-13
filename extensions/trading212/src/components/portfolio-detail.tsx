import { List } from "@raycast/api";
import { headlineChartMarkdown } from "../charts/headline";
import { DETAIL_CHART_WIDTH } from "../charts/svg";
import type { Appearance } from "../charts/theme";
import { renderTreemap } from "../charts/treemap";
import { directionOf, formatMoney, formatPct } from "../lib/format";
import { shortTicker, todayLabel, type PortfolioView } from "../lib/portfolio";

const TREEMAP_HEIGHT = 220;

function portfolioMarkdown(view: PortfolioView, appearance: Appearance): string {
  const ret = `${formatMoney(view.returnAmount, view.currency, { signed: true })} · ${formatPct(view.returnPct, { signed: true })}`;
  const svg = renderTreemap(
    view.positions.map((p) => ({ label: shortTicker(p.ticker), value: p.value, returnPct: p.returnPct })),
    { width: DETAIL_CHART_WIDTH, height: TREEMAP_HEIGHT, appearance },
  );
  return headlineChartMarkdown(
    {
      label: "Total balance",
      amount: formatMoney(view.totalBalance, view.currency),
      change: [{ text: ret, tone: directionOf(view.returnPct) }, { text: " return" }],
    },
    svg,
    TREEMAP_HEIGHT,
    appearance,
    "Portfolio map",
    [
      { label: "Invested", value: formatMoney(view.invested, view.currency) },
      { label: "Cash", value: formatMoney(view.cash, view.currency) },
      {
        label: todayLabel(view.todayAsOf, Date.now()),
        value: today(view),
        tone: view.todayPct === null ? undefined : directionOf(view.todayPct),
      },
    ],
  );
}

function today(view: PortfolioView): string {
  if (view.todayAmount === null || view.todayPct === null) return "—";
  return `${formatMoney(view.todayAmount, view.currency, { signed: true })} · ${formatPct(view.todayPct, { signed: true })}`;
}

export function PortfolioDetail({ view, appearance }: { view: PortfolioView; appearance: Appearance }) {
  return <List.Item.Detail markdown={portfolioMarkdown(view, appearance)} />;
}
