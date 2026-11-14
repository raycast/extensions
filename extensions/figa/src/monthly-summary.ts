import type { FigaMonthlyTotalItem } from "./api/types";
import { formatMoney, formatMonthLabel } from "./format.ts";

export function monthlySummaryNotes(item: FigaMonthlyTotalItem): string[] {
  const notes: string[] = [];
  if ((item.unknownCount ?? 0) > 0) notes.push(`${item.unknownCount} expense(s) have unknown amounts.`);
  if ((item.monetary?.paidUnknownCount ?? 0) > 0) notes.push("Some paid amounts cannot be valued.");
  if ((item.monetary?.estimatedFxCount ?? 0) > 0) notes.push("Includes estimated exchange rates.");
  if (item.isComplete === false && (item.unknownCount ?? 0) === 0 && (item.monetary?.paidUnknownCount ?? 0) === 0) {
    notes.push("Amounts are incomplete.");
  }
  if (item.planLimit?.restricted || (item.planLimit?.blocked ?? 0) > 0) {
    notes.push("Limited by your plan: only accessible expenses are included.");
  }
  return notes;
}

export function buildSingleMonthSummary(item: FigaMonthlyTotalItem, currency: string): string {
  return [
    formatMonthLabel(item),
    `Known total: ${formatMoney(item.totalAmount, currency)}`,
    ...(item.confirmedAmount === undefined ? [] : [`Confirmed: ${formatMoney(item.confirmedAmount, currency)}`]),
    ...(item.estimatedAmount === undefined ? [] : [`Estimated: ${formatMoney(item.estimatedAmount, currency)}`]),
    `Paid: ${formatMoney(item.paidAmount, currency)}`,
    `Confirmed unpaid: ${formatMoney(item.unpaidAmount, currency)}`,
    ...monthlySummaryNotes(item),
  ].join("\n");
}

export function buildShareableMonthSummary(item: FigaMonthlyTotalItem, currency: string): string {
  return `${buildSingleMonthSummary(item, currency)}\n\nPrepared with Figa — https://getfiga.com/`;
}
