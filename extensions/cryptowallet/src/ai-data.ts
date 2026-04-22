import { getPreferenceValues } from "@raycast/api";

import { getLatestQuotesAndConvertedTransactions } from "./coinmarketcap";
import { formatCurrency, formatNumber, formatPercent } from "./format";
import { calculateSnapshot } from "./portfolio";
import { getPortfolios, getTransactions } from "./storage";
import { AssetPosition, CryptoTransaction, Portfolio, PortfolioSnapshot, Preferences, Quote } from "./types";

export type WalletContext = {
  currency: string;
  portfolios: Portfolio[];
  transactions: CryptoTransaction[];
  quotes: Record<string, Quote>;
  snapshots: PortfolioSnapshot[];
  priceStatus: "live" | "unavailable";
  priceError?: string;
};

export async function loadWalletContext(): Promise<WalletContext> {
  const { baseCurrency } = getPreferenceValues<Preferences>();
  const [portfolios, storedTransactions] = await Promise.all([getPortfolios(), getTransactions()]);
  let transactions = storedTransactions;
  let quotes: Record<string, Quote> = {};
  let priceStatus: WalletContext["priceStatus"] = "live";
  let priceError: string | undefined;

  try {
    const pricedData = await getLatestQuotesAndConvertedTransactions(transactions, baseCurrency);
    quotes = pricedData.quotes;
    transactions = pricedData.transactions;
  } catch (error) {
    priceStatus = "unavailable";
    priceError = error instanceof Error ? error.message : "Could not load live CoinMarketCap prices.";
  }

  return {
    currency: baseCurrency,
    portfolios,
    transactions,
    quotes,
    snapshots: portfolios.map((portfolio) => calculateSnapshot(portfolio, transactions, quotes)),
    priceStatus,
    priceError,
  };
}

export function findPortfolioSnapshot(
  snapshots: PortfolioSnapshot[],
  portfolioName: string | undefined,
): PortfolioSnapshot | undefined {
  if (!portfolioName?.trim()) {
    return undefined;
  }

  const normalized = portfolioName.trim().toLowerCase();
  return snapshots.find(
    (snapshot) =>
      snapshot.portfolio.name.toLowerCase() === normalized ||
      snapshot.portfolio.name.toLowerCase().includes(normalized),
  );
}

export function summarizePosition(position: AssetPosition, currency: string) {
  return {
    symbol: position.symbol,
    name: position.name,
    quantity: formatNumber(position.quantity),
    currentPrice: formatCurrency(position.currentPrice, currency),
    averageCost: formatCurrency(position.averageCost, currency),
    currentValue: formatCurrency(position.currentValue, currency),
    costBasis: formatCurrency(position.costBasis, currency),
    realizedPnl: formatCurrency(position.realizedPnl, currency),
    unrealizedPnl: formatCurrency(position.unrealizedPnl, currency),
    totalPnl: formatCurrency(position.totalPnl, currency),
    totalPnlPercent: formatPercent(position.totalPnlPercent),
    change24h: formatPercent(position.percentChange24h),
    change7d: formatPercent(position.percentChange7d),
    transactions: position.transactions.length,
  };
}

export function summarizeSnapshot(snapshot: PortfolioSnapshot, currency: string, includeClosedPositions = false) {
  const positions = includeClosedPositions
    ? snapshot.positions
    : snapshot.positions.filter((position) => position.quantity > 0);

  return {
    id: snapshot.portfolio.id,
    name: snapshot.portfolio.name,
    emoji: snapshot.portfolio.emoji,
    description: snapshot.portfolio.description,
    pinned: Boolean(snapshot.portfolio.pinnedAt),
    currentValue: formatCurrency(snapshot.totalValue, currency),
    costBasis: formatCurrency(snapshot.totalCostBasis, currency),
    realizedPnl: formatCurrency(snapshot.realizedPnl, currency),
    unrealizedPnl: formatCurrency(snapshot.unrealizedPnl, currency),
    totalPnl: formatCurrency(snapshot.totalPnl, currency),
    totalPnlPercent: formatPercent(snapshot.totalPnlPercent),
    positions: positions.map((position) => summarizePosition(position, currency)),
  };
}

export function totalSummary(snapshots: PortfolioSnapshot[], currency: string) {
  const totalValue = snapshots.reduce((sum, snapshot) => sum + snapshot.totalValue, 0);
  const totalPnl = snapshots.reduce((sum, snapshot) => sum + snapshot.totalPnl, 0);
  const invested = snapshots.reduce(
    (sum, snapshot) =>
      sum + snapshot.positions.reduce((positionSum, position) => positionSum + position.investedAmount, 0),
    0,
  );

  return {
    currentValue: formatCurrency(totalValue, currency),
    totalPnl: formatCurrency(totalPnl, currency),
    totalPnlPercent: formatPercent(invested === 0 ? 0 : (totalPnl / invested) * 100),
  };
}
