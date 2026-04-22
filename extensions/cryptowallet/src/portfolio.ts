import { quoteKey } from "./coinmarketcap";
import { AssetPosition, CryptoTransaction, Portfolio, PortfolioSnapshot, Quote } from "./types";

function byAssetKey(transaction: CryptoTransaction): string {
  return transaction.assetId ? String(transaction.assetId) : transaction.assetSymbol.toUpperCase();
}

function withQuote(position: AssetPosition, quote?: Quote): AssetPosition {
  const currentPrice = quote?.price;
  const currentValue = currentPrice === undefined ? undefined : position.quantity * currentPrice;
  const unrealizedPnl = currentValue === undefined ? undefined : currentValue - position.costBasis;
  const unrealizedPnlPercent =
    unrealizedPnl === undefined || position.costBasis === 0 ? undefined : (unrealizedPnl / position.costBasis) * 100;
  const totalPnl = unrealizedPnl === undefined ? position.realizedPnl : position.realizedPnl + unrealizedPnl;
  const totalPnlPercent = position.investedAmount === 0 ? undefined : (totalPnl / position.investedAmount) * 100;

  return {
    ...position,
    name: quote?.name || position.name,
    assetId: quote?.id || position.assetId,
    currentPrice,
    currentValue,
    unrealizedPnl,
    unrealizedPnlPercent,
    totalPnl,
    totalPnlPercent,
    percentChange24h: quote?.percentChange24h,
    percentChange7d: quote?.percentChange7d,
  };
}

export function calculatePositions(transactions: CryptoTransaction[], quotes: Record<string, Quote>): AssetPosition[] {
  const grouped = new Map<string, CryptoTransaction[]>();
  transactions.forEach((transaction) => {
    const key = byAssetKey(transaction);
    grouped.set(key, [...(grouped.get(key) || []), transaction]);
  });

  return Array.from(grouped.values())
    .map((assetTransactions) => {
      const ordered = [...assetTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      let quantity = 0;
      let costBasis = 0;
      let investedAmount = 0;
      let realizedPnl = 0;

      ordered.forEach((transaction) => {
        const gross = transaction.quantity * transaction.price;
        const averageCost = quantity > 0 ? costBasis / quantity : 0;

        if (transaction.type === "buy" || transaction.type === "transfer_in") {
          quantity += transaction.quantity;
          costBasis += gross + transaction.fee;
          investedAmount += gross + transaction.fee;
          return;
        }

        const closedCost = Math.min(transaction.quantity, quantity) * averageCost;
        quantity = Math.max(0, quantity - transaction.quantity);
        costBasis = Math.max(0, costBasis - closedCost);

        if (transaction.type === "sell") {
          realizedPnl += gross - transaction.fee - closedCost;
        }
      });

      const latest = ordered[ordered.length - 1];
      const position: AssetPosition = {
        assetId: latest.assetId,
        symbol: latest.assetSymbol,
        name: latest.assetName,
        quantity,
        averageCost: quantity > 0 ? costBasis / quantity : 0,
        costBasis,
        investedAmount,
        realizedPnl,
        transactions: ordered.reverse(),
      };

      return withQuote(position, quotes[quoteKey(position)]);
    })
    .filter((position) => position.quantity > 0 || position.realizedPnl !== 0 || position.transactions.length > 0)
    .sort((a, b) => (b.currentValue || 0) - (a.currentValue || 0));
}

export function calculateSnapshot(
  portfolio: Portfolio,
  transactions: CryptoTransaction[],
  quotes: Record<string, Quote>,
): PortfolioSnapshot {
  const positions = calculatePositions(
    transactions.filter((transaction) => transaction.portfolioId === portfolio.id),
    quotes,
  );

  const totalCostBasis = positions.reduce((sum, position) => sum + position.costBasis, 0);
  const investedAmount = positions.reduce((sum, position) => sum + position.investedAmount, 0);
  const totalValue = positions.reduce((sum, position) => sum + (position.currentValue || 0), 0);
  const realizedPnl = positions.reduce((sum, position) => sum + position.realizedPnl, 0);
  const unrealizedPnl = positions.reduce((sum, position) => sum + (position.unrealizedPnl || 0), 0);
  const totalPnl = realizedPnl + unrealizedPnl;
  const totalPnlPercent = investedAmount === 0 ? 0 : (totalPnl / investedAmount) * 100;

  return {
    portfolio,
    positions,
    totalCostBasis,
    totalValue,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    totalPnlPercent,
  };
}

export function buildValueSparkline(values: number[]): string {
  if (values.length === 0) {
    return "";
  }

  if (values.length === 1) {
    return "";
  }

  const blocks = "▁▂▃▄▅▆▇█";
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (min === max) {
    return blocks[3].repeat(values.length);
  }

  return values
    .map((value) => {
      const index = Math.round(((value - min) / (max - min)) * (blocks.length - 1));
      return blocks[index];
    })
    .join("");
}

export function buildLocalPositionTimeline(position: AssetPosition): number[] {
  let quantity = 0;
  let costBasis = 0;

  return [...position.transactions].reverse().map((transaction) => {
    const gross = transaction.quantity * transaction.price;
    const averageCost = quantity > 0 ? costBasis / quantity : 0;

    if (transaction.type === "buy" || transaction.type === "transfer_in") {
      quantity += transaction.quantity;
      costBasis += gross + transaction.fee;
    } else {
      const closedCost = Math.min(transaction.quantity, quantity) * averageCost;
      quantity = Math.max(0, quantity - transaction.quantity);
      costBasis = Math.max(0, costBasis - closedCost);
    }

    return quantity * (position.currentPrice || transaction.price);
  });
}

export function buildLocalPortfolioTimeline(snapshot: PortfolioSnapshot): number[] {
  const positionsByKey = new Map<string, AssetPosition>();
  snapshot.positions.forEach((position) => {
    positionsByKey.set(`${position.assetId || position.symbol}`, position);
  });

  const orderedTransactions = snapshot.positions
    .flatMap((position) => position.transactions)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const quantities = new Map<string, number>();

  return orderedTransactions.map((transaction) => {
    const key = `${transaction.assetId || transaction.assetSymbol}`;
    const currentQuantity = quantities.get(key) || 0;

    if (transaction.type === "buy" || transaction.type === "transfer_in") {
      quantities.set(key, currentQuantity + transaction.quantity);
    } else {
      quantities.set(key, Math.max(0, currentQuantity - transaction.quantity));
    }

    return Array.from(quantities.entries()).reduce((sum, [positionKey, quantity]) => {
      const position = positionsByKey.get(positionKey);
      const price = position?.currentPrice || position?.averageCost || 0;
      return sum + quantity * price;
    }, 0);
  });
}
