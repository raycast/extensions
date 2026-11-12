import { Icon } from "@raycast/api";
import { Currency } from "./common";

/** A merchant category, resolved from an MCC. */
export interface MccCategory {
  /** Group code from the MCC dataset, e.g. "AL" for airlines. */
  group: string;
  groupName: string;
  groupNameUk: string;
  name: string;
  nameUk: string;
  icon: Icon;
}

export interface Transaction {
  id: string;
  /** Unix time in seconds. */
  time: number;
  description: string;
  mcc: number;
  originalMcc: number;
  category: MccCategory;
  /** Whether the merchant's bank hasn't settled the transaction yet. The money is already blocked, but the amount may still change. */
  hold: boolean;
  /** In the account currency. Negative for expenses. */
  amount: number;
  currency: Currency;
  /** In `operationCurrency`, which differs from `currency` for purchases in another currency. */
  operationAmount: number;
  operationCurrency: Currency;
  /** In the account currency. */
  commission: number;
  /** In the account currency, or in miles for accounts with Miles cashback. */
  cashback: number;
  /** Balance after the transaction, in the account currency. */
  balance: number;
  comment?: string;
  /** Receipt number on check.gov.ua. */
  receiptId?: string;
  invoiceId?: string;
  counterEdrpou?: string;
  counterIban?: string;
  counterName?: string;
}

export type PeriodPreset = "today" | "last7Days" | "thisMonth" | "lastMonth" | "last31Days";

/** A preset, resolved relative to now, or a fixed range in unix seconds. */
export type Period = { preset: PeriodPreset } | { from: number; to: number };

/** The period last chosen in a statement, with the account it was chosen on. */
export interface SavedPeriod {
  accountId: string;
  period: Period;
}
