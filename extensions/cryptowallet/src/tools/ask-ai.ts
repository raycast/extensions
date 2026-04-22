import { findPortfolioSnapshot, loadWalletContext, summarizeSnapshot, totalSummary } from "../ai-data";
import { formatCurrency, formatDateTime, formatNumber, transactionTypeLabel } from "../format";

type Input = {
  /**
   * Free-form question about the user's CryptoWallet portfolios, holdings, performance, transactions, or reports.
   */
  question: string;
  /**
   * Optional portfolio name if the question is about one wallet.
   */
  portfolioName?: string;
};

export default async function askAi(input: Input) {
  const context = await loadWalletContext();
  const selectedSnapshot = findPortfolioSnapshot(context.snapshots, input.portfolioName);

  if (input.portfolioName && !selectedSnapshot) {
    return {
      question: input.question,
      error: `Portfolio "${input.portfolioName}" was not found.`,
      availablePortfolios: context.portfolios.map((portfolio) => portfolio.name),
    };
  }

  const snapshots = selectedSnapshot ? [selectedSnapshot] : context.snapshots;
  const transactions = context.transactions
    .filter((transaction) => snapshots.some((snapshot) => snapshot.portfolio.id === transaction.portfolioId))
    .slice(0, 25);

  return {
    question: input.question,
    generatedAt: new Date().toISOString(),
    instructions:
      "Answer the user's question using this CryptoWallet context. Be concise, mention that this is not financial advice when the user asks for investment guidance, and mention priceStatus if live prices are unavailable.",
    currency: context.currency,
    priceStatus: context.priceStatus,
    priceError: context.priceError,
    total: totalSummary(snapshots, context.currency),
    portfolios: snapshots.map((snapshot) => summarizeSnapshot(snapshot, context.currency, true)),
    recentTransactions: transactions.map((transaction) => ({
      date: formatDateTime(transaction.date),
      portfolio: context.portfolios.find((portfolio) => portfolio.id === transaction.portfolioId)?.name,
      asset: `${transaction.assetName} (${transaction.assetSymbol})`,
      type: transactionTypeLabel(transaction.type),
      quantity: `${formatNumber(transaction.quantity)} ${transaction.assetSymbol}`,
      price: formatCurrency(transaction.price, context.currency),
      grossValue: formatCurrency(transaction.quantity * transaction.price, context.currency),
      fee: formatCurrency(transaction.fee, context.currency),
      notes: transaction.notes,
    })),
  };
}
