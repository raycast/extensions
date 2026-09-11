import type { Transaction } from "./types";

/** True when the entry is an account-to-account transfer (paired legs on Toshl). */
export function isTransferEntry(t: Transaction): boolean {
  return !!t.transaction?.account;
}
