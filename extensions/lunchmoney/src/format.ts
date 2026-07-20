// Mock mode flag for randomizing amounts in screenshots
// Set to true when taking screenshots to randomize amounts under $200

import { Transaction, Category } from "./api";

export const isMockMode = false; // Set to false for real data

const mockValues = [
  12.34, 23.45, 34.56, 45.67, 56.78, 67.89, 78.9, 89.01, 98.76, 87.65, 76.54, 65.43, 54.32, 43.21, 123.45, 111.11,
  99.99, 88.88, 77.77, 66.66, 55.55, 44.44, 33.33, 22.22, 11.11,
];

function getMockAmount(): number {
  return mockValues[Math.floor(Math.random() * mockValues.length)];
}

/**
 * Returns the numeric amount value (for calculations)
 * Respects mock mode for screenshots
 */
export function getAmountValue(amount: string | number, isIncome?: boolean): number {
  if (!isMockMode) {
    return typeof amount === "string" ? parseFloat(amount) : amount;
  }

  const mockAmount = getMockAmount();
  return isIncome ? -mockAmount : mockAmount;
}

/**
 * Signed transaction amount in the user's primary currency.
 *
 * Uses LunchMoney's `to_base` (amount converted to the primary currency) so totals over
 * mixed-currency transactions add up correctly; falls back to the raw `amount` when
 * `to_base` is absent. Sign follows LunchMoney's convention: positive = debit (money out /
 * expense), negative = credit (money in / income or refund). The transaction's own sign is
 * authoritative — a refund sitting in an expense category is still a credit.
 */
export function getTransactionBaseValue(transaction: { amount: string; to_base?: number | null }): number {
  const value = transaction.to_base ?? parseFloat(transaction.amount);
  if (!isMockMode) {
    return value;
  }
  // In mock mode, randomize the magnitude (as getAmountValue does for screenshots) while
  // preserving the debit/credit sign, so totals never show real figures.
  const mockAmount = getMockAmount();
  return value < 0 ? -mockAmount : mockAmount;
}

/**
 * Formats a currency amount using Intl.NumberFormat
 * Respects mock mode for screenshots
 */
export function formatCurrency(amount: string | number, currency = "USD", isIncome?: boolean): string {
  const value = getAmountValue(amount, isIncome);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Math.abs(value));
}

/**
 * Formats a currency amount with sign prefix (+/-)
 * Respects mock mode for screenshots
 */
export function formatSignedCurrency(
  amount: string | number,
  currency = "USD",
  options?: { isIncome?: boolean; isExpense?: boolean },
): string {
  const value = getAmountValue(amount, options?.isIncome);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(Math.abs(value));

  if (options?.isIncome) {
    return `+${formatted}`;
  }
  if (options?.isExpense) {
    return `-${formatted}`;
  }
  // Determine sign from value
  return value < 0 ? `+${formatted}` : `-${formatted}`;
}

/**
 * Builds a direct deep-link to a single transaction in the LunchMoney web app.
 * Format matches the web app's "Copy Link" action: /transactions?transaction_id=<id>
 */
export function buildLunchMoneyUrl(transaction: { id: number }): string {
  return `https://my.lunchmoney.app/transactions?transaction_id=${transaction.id}`;
}

export function formatTransactionsAsText(transactions: Transaction[], categories: Category[]): string {
  const data = transactions.map((t) => {
    const category = categories.find((c) => c.id === t.category_id);
    // Sign comes from the transaction amount (positive = expense, negative = credit),
    // not the category — a refund/credit sitting in an expense category is still a credit.
    const formattedAmount = formatSignedCurrency(t.amount, t.currency);

    return {
      Date: t.date,
      Payee: t.payee || "",
      Amount: formattedAmount,
      Category: category?.name || "Uncategorized",
    };
  });

  if (data.length === 0) return "";

  const headers = Object.keys(data[0]).join(",");
  const rows = data
    .map((row) =>
      Object.values(row)
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(","),
    )
    .join("\n");

  return `${headers}\n${rows}`;
}
