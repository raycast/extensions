import { formatCurrency, formatDateTime, formatNumber, formatPercent, transactionTypeLabel } from "./format";
import { buildLocalPortfolioTimeline, buildLocalPositionTimeline } from "./portfolio";
import { AssetPosition, CryptoTransaction, PortfolioSnapshot } from "./types";

export type ChartLayout = "stacked" | "grid";

const chartColors = [
  "#22c55e",
  "#38bdf8",
  "#f59e0b",
  "#ef4444",
  "#a78bfa",
  "#14b8a6",
  "#f97316",
  "#e879f9",
  "#84cc16",
  "#64748b",
];

function shortDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit" }).format(new Date(value));
}

function trimSeries(labels: string[], values: number[], maxPoints = 42): { labels: string[]; values: number[] } {
  if (values.length <= maxPoints) {
    return { labels, values };
  }

  return {
    labels: labels.slice(-maxPoints),
    values: values.slice(-maxPoints),
  };
}

function quickChartUrl(config: object, width = 900, height = 360): string {
  const params = new URLSearchParams({
    width: String(width),
    height: String(height),
    devicePixelRatio: "2",
    backgroundColor: "transparent",
    version: "4",
    format: "png",
    c: JSON.stringify(config),
  });

  return `https://quickchart.io/chart?${params.toString()}`;
}

function chartImage(markdownTitle: string, url: string, layout: ChartLayout, height: number): string {
  const width = layout === "grid" ? 380 : 780;
  const resolvedHeight = layout === "grid" ? Math.round(height * 0.74) : height;
  return `![${markdownTitle}](${url}&raycast-width=${width}&raycast-height=${resolvedHeight})`;
}

function lineChartConfig(labels: string[], values: number[], currency: string, label: string): object {
  return {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label,
          data: values.map((value) => Number(value.toFixed(2))),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34, 197, 94, 0.18)",
          borderWidth: 3,
          fill: true,
          pointRadius: values.length <= 18 ? 3 : 0,
          pointBackgroundColor: "#22c55e",
          tension: 0.35,
        },
      ],
    },
    options: {
      plugins: {
        legend: { display: false },
        title: {
          display: true,
          text: `${label} (${currency})`,
          color: "#f8fafc",
          font: { size: 18, weight: "bold" },
        },
      },
      scales: {
        x: {
          ticks: { color: "#cbd5e1", maxRotation: 0, autoSkip: true },
          grid: { color: "rgba(148, 163, 184, 0.16)" },
        },
        y: {
          ticks: { color: "#cbd5e1" },
          grid: { color: "rgba(148, 163, 184, 0.16)" },
        },
      },
      elements: { line: { capBezierPoints: true } },
    },
  };
}

export function portfolioValueChartUrl(snapshot: PortfolioSnapshot, currency: string): string | undefined {
  const values = buildLocalPortfolioTimeline(snapshot);
  if (values.length < 2) {
    return undefined;
  }

  const orderedTransactions = snapshot.positions
    .flatMap((position) => position.transactions)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const labels = orderedTransactions.map((transaction) => shortDate(transaction.date));
  const series = trimSeries(labels, values);

  return quickChartUrl(lineChartConfig(series.labels, series.values, currency, "Portfolio value"));
}

export function assetValueChartUrl(position: AssetPosition, currency: string): string | undefined {
  const values = buildLocalPositionTimeline(position);
  if (values.length < 2) {
    return undefined;
  }

  const labels = [...position.transactions].reverse().map((transaction) => shortDate(transaction.date));
  const series = trimSeries(labels, values);

  return quickChartUrl(lineChartConfig(series.labels, series.values, currency, `${position.symbol} value`));
}

export function portfolioAllocationChartUrl(snapshot: PortfolioSnapshot, currency: string): string | undefined {
  const positions = snapshot.positions.filter((position) => (position.currentValue || 0) > 0);
  if (positions.length < 2) {
    return undefined;
  }

  return quickChartUrl(
    {
      type: "doughnut",
      data: {
        labels: positions.map((position) => position.symbol),
        datasets: [
          {
            data: positions.map((position) => Number((position.currentValue || 0).toFixed(2))),
            backgroundColor: positions.map((_, index) => chartColors[index % chartColors.length]),
            borderColor: "#111827",
            borderWidth: 2,
          },
        ],
      },
      options: {
        plugins: {
          legend: {
            position: "right",
            labels: { color: "#f8fafc", boxWidth: 14, padding: 14 },
          },
          title: {
            display: true,
            text: `Allocation by value (${currency})`,
            color: "#f8fafc",
            font: { size: 18, weight: "bold" },
          },
        },
      },
    },
    900,
    420,
  );
}

export function assetCashFlowChartUrl(position: AssetPosition, currency: string): string | undefined {
  if (position.transactions.length < 2) {
    return undefined;
  }

  const orderedTransactions = [...position.transactions].reverse();
  const labels = orderedTransactions.map((transaction) => shortDate(transaction.date));
  const values = orderedTransactions.map((transaction) => {
    const value = transaction.quantity * transaction.price + transaction.fee;
    return transaction.type === "buy" || transaction.type === "transfer_in" ? value : -value;
  });
  const series = trimSeries(labels, values);

  return quickChartUrl(
    {
      type: "bar",
      data: {
        labels: series.labels,
        datasets: [
          {
            label: `Transaction flow (${currency})`,
            data: series.values.map((value) => Number(value.toFixed(2))),
            backgroundColor: series.values.map((value) =>
              value >= 0 ? "rgba(34, 197, 94, 0.78)" : "rgba(239, 68, 68, 0.78)",
            ),
            borderColor: series.values.map((value) => (value >= 0 ? "#22c55e" : "#ef4444")),
            borderWidth: 1,
          },
        ],
      },
      options: {
        plugins: {
          legend: { display: false },
          title: {
            display: true,
            text: `Transaction flow (${currency})`,
            color: "#f8fafc",
            font: { size: 18, weight: "bold" },
          },
        },
        scales: {
          x: {
            ticks: { color: "#cbd5e1", maxRotation: 0, autoSkip: true },
            grid: { color: "rgba(148, 163, 184, 0.16)" },
          },
          y: {
            ticks: { color: "#cbd5e1" },
            grid: { color: "rgba(148, 163, 184, 0.16)" },
          },
        },
      },
    },
    900,
    360,
  );
}

function chartsMarkdown(
  charts: { title: string; url: string | undefined; empty: string; height: number }[],
  layout: ChartLayout,
): string {
  if (layout === "grid") {
    const availableCharts = charts.filter((chart) => chart.url);
    if (availableCharts.length >= 2) {
      const [first, second] = availableCharts;
      return [
        `| ${first.title} | ${second.title} |`,
        "| --- | --- |",
        `| ${chartImage(first.title, first.url as string, "grid", first.height)} | ${chartImage(
          second.title,
          second.url as string,
          "grid",
          second.height,
        )} |`,
        ...charts.filter((chart) => !chart.url).map((chart) => `_ ${chart.empty.replace(/^_?|_?$/g, "")} _`),
      ].join("\n");
    }
  }

  return charts
    .map((chart) => (chart.url ? chartImage(chart.title, chart.url, "stacked", chart.height) : chart.empty))
    .join("\n\n");
}

function transactionTotals(transactions: CryptoTransaction[]) {
  return transactions.reduce(
    (totals, transaction) => {
      const gross = transaction.quantity * transaction.price;
      if (transaction.type === "buy" || transaction.type === "transfer_in") {
        totals.inflow += gross + transaction.fee;
      } else {
        totals.outflow += gross - transaction.fee;
      }
      totals.fees += transaction.fee;
      return totals;
    },
    { inflow: 0, outflow: 0, fees: 0 },
  );
}

export function portfolioChartMarkdown(snapshot: PortfolioSnapshot, currency: string, layout: ChartLayout): string {
  const valueChart = portfolioValueChartUrl(snapshot, currency);
  const allocationChart = portfolioAllocationChartUrl(snapshot, currency);
  const transactions = snapshot.positions.flatMap((position) => position.transactions);
  const latestTransaction = transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  const totals = transactionTotals(transactions);
  const topPositions = snapshot.positions
    .filter((position) => (position.currentValue || 0) > 0)
    .slice(0, 6)
    .map((position) => {
      const allocation =
        snapshot.totalValue === 0 ? undefined : ((position.currentValue || 0) / snapshot.totalValue) * 100;
      return `| ${position.symbol} | ${formatCurrency(position.currentValue, currency)} | ${formatPercent(
        allocation,
      )} | ${formatPercent(position.totalPnlPercent)} |`;
    });

  return [
    `# ${snapshot.portfolio.name}`,
    chartsMarkdown(
      [
        {
          title: "Portfolio value",
          url: valueChart,
          height: 312,
          empty: "_Add at least two transactions to build a local portfolio-value chart._",
        },
        {
          title: "Allocation",
          url: allocationChart,
          height: 364,
          empty: "_Add at least two open positions to build an allocation chart._",
        },
      ],
      layout,
    ),
    [
      "| Metric | Value |",
      "| --- | ---: |",
      `| Current value | **${formatCurrency(snapshot.totalValue, currency)}** |`,
      `| Total P/L | **${formatCurrency(snapshot.totalPnl, currency)} · ${formatPercent(snapshot.totalPnlPercent)}** |`,
      `| Realized / Unrealized | ${formatCurrency(snapshot.realizedPnl, currency)} / ${formatCurrency(
        snapshot.unrealizedPnl,
        currency,
      )} |`,
      `| Cost basis | ${formatCurrency(snapshot.totalCostBasis, currency)} |`,
      `| Positions / Transactions | ${snapshot.positions.length} / ${transactions.length} |`,
      `| In / Out / Fees | ${formatCurrency(totals.inflow, currency)} / ${formatCurrency(
        totals.outflow,
        currency,
      )} / ${formatCurrency(totals.fees, currency)} |`,
    ].join("\n"),
    topPositions.length
      ? ["## Top Holdings", "| Asset | Value | Weight | P/L |", "| --- | ---: | ---: | ---: |", ...topPositions].join(
          "\n",
        )
      : "",
    latestTransaction ? `Last transaction: **${formatDateTime(latestTransaction.date)}**` : "",
    "Charts use your local transactions and latest CoinMarketCap prices.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export function assetChartMarkdown(position: AssetPosition, currency: string, layout: ChartLayout): string {
  const valueChart = assetValueChartUrl(position, currency);
  const cashFlowChart = assetCashFlowChartUrl(position, currency);
  const values = buildLocalPositionTimeline(position);
  const latest = values.at(-1);
  const first = values[0];
  const change = first && latest ? ((latest - first) / first) * 100 : undefined;
  const totals = transactionTotals(position.transactions);
  const latestTransactions = position.transactions.slice(0, 5).map((transaction) => {
    const gross = transaction.quantity * transaction.price;
    return `| ${formatDateTime(transaction.date)} | ${transactionTypeLabel(transaction.type)} | ${formatNumber(
      transaction.quantity,
    )} | ${formatCurrency(gross, currency)} |`;
  });

  return [
    `# ${position.symbol} Local Value`,
    chartsMarkdown(
      [
        {
          title: `${position.symbol} value`,
          url: valueChart,
          height: 312,
          empty: "_Add at least two transactions for this asset to build a local value chart._",
        },
        {
          title: "Transaction flow",
          url: cashFlowChart,
          height: 312,
          empty: "_Add at least two transactions for this asset to build a transaction-flow chart._",
        },
      ],
      layout,
    ),
    [
      "| Metric | Value |",
      "| --- | ---: |",
      `| Current value | **${formatCurrency(position.currentValue, currency)}** |`,
      `| Total P/L | **${formatCurrency(position.totalPnl, currency)} · ${formatPercent(position.totalPnlPercent)}** |`,
      `| Quantity / Avg cost | ${formatNumber(position.quantity)} ${position.symbol} / ${formatCurrency(
        position.averageCost,
        currency,
      )} |`,
      `| Current price | ${formatCurrency(position.currentPrice, currency)} |`,
      `| Cost basis | ${formatCurrency(position.costBasis, currency)} |`,
      `| Realized / Unrealized | ${formatCurrency(position.realizedPnl, currency)} / ${formatCurrency(
        position.unrealizedPnl,
        currency,
      )} |`,
      `| In / Out / Fees | ${formatCurrency(totals.inflow, currency)} / ${formatCurrency(
        totals.outflow,
        currency,
      )} / ${formatCurrency(totals.fees, currency)} |`,
      `| Series change | ${formatPercent(change)} |`,
    ].join("\n"),
    latestTransactions.length
      ? [
          "## Latest Transactions",
          "| Date | Type | Quantity | Gross |",
          "| --- | --- | ---: | ---: |",
          ...latestTransactions,
        ].join("\n")
      : "",
    "This chart uses your transactions and latest prices. Historical market charts require CoinMarketCap historical endpoints.",
  ]
    .filter(Boolean)
    .join("\n\n");
}
