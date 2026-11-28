import { dateOnly, decimal } from "./format";
import type { BalanceEntry, FinancialAccount } from "./types";

const CLEARED_TYPES = [
  "CLOSING_CLEARED",
  "INTERIM_CLEARED",
  "CLOSING_BOOKED",
  "INTERIM_BOOKED",
  "OPENING_BOOKED",
  "OPENING_CLEARED",
  "PREVIOUSLY_CLOSED_BOOKED",
  "INFORMATION",
  "OTHER",
];
const AVAILABLE_TYPES = [
  "CLOSING_AVAILABLE",
  "FORWARD_AVAILABLE",
  "INTERIM_AVAILABLE",
  "EXPECTED",
  "OPENING_AVAILABLE",
  "AUTHORISED",
];

/** Mirrors Synci's account-summary selection using a COMPLETE balance history. */
export function restoreMissingBalances(
  account: FinancialAccount,
  history: BalanceEntry[],
  now = new Date(),
): FinancialAccount {
  const records = history
    .filter((entry) => !entry.reference_date || entry.reference_date.slice(0, 10) <= dateOnly(now))
    .sort((a, b) => {
      for (const key of ["updated_at", "integrator_last_changed_at", "reference_date"] as const) {
        const difference = (b[key] || "").localeCompare(a[key] || "");
        if (difference) return difference;
      }
      return 0;
    });
  const select = (types: string[]) => {
    for (const type of types) {
      const entry = records.find((record) => record.type === type);
      if (entry && decimal(entry.amount)) return entry;
    }
  };
  const cleared = select(CLEARED_TYPES);
  const available = select(AVAILABLE_TYPES) ?? cleared;
  const matchingAmount = (entry?: BalanceEntry) => (entry?.currency === account.currency ? entry?.amount : undefined);
  return {
    ...account,
    balance: {
      cleared: account.balance?.cleared ?? matchingAmount(cleared),
      available: account.balance?.available ?? matchingAmount(available),
    },
    balance_warning: [cleared, available].some((entry) => entry?.credit_limit_included)
      ? "The reported balance includes a credit limit."
      : undefined,
  };
}
