import { Expense } from "../types/get_expenses.types";
import { Color } from "@raycast/api";

export function getCurrency_code(currency_code: string) {
  switch (currency_code) {
    case "USD":
      return { symbol: "$", emoji: "💵" };
    case "HKD":
      return { symbol: "$", emoji: "💵" };
    case "EUR":
      return { symbol: "€", emoji: "💶" };
    case "GBP":
      return { symbol: "£", emoji: "💷" };
    case "JPY":
      return { symbol: "¥", emoji: "💴" };
    case "INR":
      return { symbol: "₹", emoji: "💵" };
    default:
      return { symbol: currency_code, emoji: "💸" };
  }
}

export function getColor(expense: Expense, currentUserID: number) {
  const netBalance = expense.users
    .filter((user) => user.user.id === currentUserID)
    .map((user) => Number(user.net_balance))[0];

  if (netBalance > 0) {
    return Color.Green;
  } else if (netBalance < 0) {
    return Color.Red;
  } else {
    return Color.PrimaryText;
  }
}

export function expenseSplitEqually(owes: string[]) {
  const similarThreshold = 0.03;
  const owedShareNumbers = owes.map((owedShare) => Number(owedShare));
  const firstOwedShare = owedShareNumbers[0];
  const isSimilarOwedShares = owedShareNumbers.every(
    (owedShare) => Math.abs(owedShare - firstOwedShare) <= similarThreshold
  );
  return isSimilarOwedShares;
}
