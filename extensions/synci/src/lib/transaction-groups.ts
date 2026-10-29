import { compareTransactionsNewestFirst, dateLabel, dateOnly, transactionDate } from "./format";
import type { Transaction } from "./types";

export function dayLabel(day: string, now = new Date()): string {
  if (!day) return "Date Not Reported";
  if (day === dateOnly(now)) return "Today";
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (day === dateOnly(yesterday)) return "Yesterday";
  return dateLabel(day);
}

/** Group the loaded set by the returned mapped date, even if the API's sort differs. */
export function transactionGroups(transactions: Transaction[], now = new Date()) {
  const unique = [...new Map(transactions.map((transaction) => [transaction.id, transaction])).values()];
  const groups: { date: string; title: string; transactions: Transaction[] }[] = [];
  for (const transaction of unique.sort(compareTransactionsNewestFirst)) {
    const date = transactionDate(transaction) || "";
    if (groups.at(-1)?.date !== date) groups.push({ date, title: dayLabel(date, now), transactions: [] });
    groups.at(-1)!.transactions.push(transaction);
  }
  return groups;
}
