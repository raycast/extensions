import { formatCurrency, formatDateTime, formatNumber, formatPercent } from "./format";
import { calculateSnapshot } from "./portfolio";
import { CryptoTransaction, Portfolio, Quote } from "./types";

export function generatePortfolioReport(
  portfolios: Portfolio[],
  transactions: CryptoTransaction[],
  quotes: Record<string, Quote>,
  currency: string,
): string {
  const snapshots = portfolios.map((portfolio) => calculateSnapshot(portfolio, transactions, quotes));
  const totalValue = snapshots.reduce((sum, snapshot) => sum + snapshot.totalValue, 0);
  const totalPnl = snapshots.reduce((sum, snapshot) => sum + snapshot.totalPnl, 0);
  const totalInvested = snapshots.reduce(
    (sum, snapshot) =>
      sum + snapshot.positions.reduce((positionSum, position) => positionSum + position.investedAmount, 0),
    0,
  );
  const totalPnlPercent = totalInvested === 0 ? 0 : (totalPnl / totalInvested) * 100;

  return [
    "# CryptoWallet Report",
    "",
    `Generated: ${new Date().toLocaleString()}`,
    `Currency: ${currency}`,
    "",
    "## Overview",
    "",
    `- Current value: **${formatCurrency(totalValue, currency)}**`,
    `- Total P/L: **${formatCurrency(totalPnl, currency)} (${formatPercent(totalPnlPercent)})**`,
    `- Portfolios: **${snapshots.length}**`,
    "",
    ...snapshots.flatMap((snapshot) => [
      `## ${snapshot.portfolio.emoji ? `${snapshot.portfolio.emoji} ` : ""}${snapshot.portfolio.name}`,
      "",
      snapshot.portfolio.description ? `${snapshot.portfolio.description}\n` : "",
      `- Current value: **${formatCurrency(snapshot.totalValue, currency)}**`,
      `- Realized P/L: **${formatCurrency(snapshot.realizedPnl, currency)}**`,
      `- Unrealized P/L: **${formatCurrency(snapshot.unrealizedPnl, currency)}**`,
      `- Total P/L: **${formatCurrency(snapshot.totalPnl, currency)} (${formatPercent(snapshot.totalPnlPercent)})**`,
      "",
      "| Asset | Quantity | Avg Cost | Value | Total P/L |",
      "| --- | ---: | ---: | ---: | ---: |",
      ...snapshot.positions.map(
        (position) =>
          `| ${position.name} (${position.symbol}) | ${formatNumber(position.quantity)} | ${formatCurrency(
            position.averageCost,
            currency,
          )} | ${formatCurrency(position.currentValue, currency)} | ${formatCurrency(position.totalPnl, currency)} (${formatPercent(
            position.totalPnlPercent,
          )}) |`,
      ),
      "",
      "### Transactions",
      "",
      ...transactions
        .filter((transaction) => transaction.portfolioId === snapshot.portfolio.id)
        .map(
          (transaction) =>
            `- ${formatDateTime(transaction.date)} · ${transaction.assetSymbol} · ${transaction.type} · ${formatNumber(
              transaction.quantity,
            )} at ${formatCurrency(transaction.price, currency)}${transaction.notes ? ` · ${transaction.notes}` : ""}`,
        ),
      "",
    ]),
  ].join("\n");
}

export function serializeBackupForClipboard(value: unknown): string {
  return JSON.stringify(value, null, 2);
}
