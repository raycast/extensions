import { balanceTotals } from "./finance";
import type { FinancialAccount } from "./types";

export function menuBarSummary(accounts: FinancialAccount[], selectedIds: string[], currency: string) {
  const selected = accounts.filter((account) => account.enabled && selectedIds.includes(String(account.id)));
  const summary = balanceTotals(selected);
  const displayed = summary.totals.find(([code]) => code === currency);
  return { ...summary, selected, displayed };
}
