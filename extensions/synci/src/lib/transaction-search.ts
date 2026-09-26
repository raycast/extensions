import { decimal } from "./format";
import type { Transaction } from "./types";

/** Plain amounts match either direction; an explicit sign restricts the direction. */
export function amountSearch(search?: string) {
  const text = search?.trim().replace(/−/g, "-");
  if (!text || !/^[+-]?\d+(?:[.,]\d+)?$/.test(text)) return undefined;
  const amount = decimal(text.replace(",", "."));
  if (!amount) return undefined;
  const signed = /^[+-]/.test(text);
  return {
    label: `${signed ? (text.startsWith("+") ? "+" : "") : "±"}${amount.toString()}`,
    matches: (transaction: Transaction) => {
      const value = decimal(transaction.amount);
      return !!value && (signed ? value.eq(amount) : value.abs().eq(amount));
    },
  };
}
