/**
 * Helper functions for account-related components.
 */

import type { MonetaryAccount, MonetaryAccountType, Payment } from "../../api/endpoints";

export function getAccountTypeLabel(type: MonetaryAccountType): string {
  switch (type) {
    case "MonetaryAccountJoint":
      return "Joint Accounts";
    case "MonetaryAccountBank":
      return "Bank Accounts";
    case "MonetaryAccountSavings":
      return "Savings Accounts";
    default:
      return "Other Accounts";
  }
}

export function groupAccountsByType(accounts: MonetaryAccount[]): Map<MonetaryAccountType, MonetaryAccount[]> {
  const grouped = new Map<MonetaryAccountType, MonetaryAccount[]>();

  // Define the order we want to display account types
  const typeOrder: MonetaryAccountType[] = ["MonetaryAccountJoint", "MonetaryAccountBank", "MonetaryAccountSavings"];

  // Initialize empty arrays for each type to maintain order
  for (const type of typeOrder) {
    grouped.set(type, []);
  }

  // Group accounts
  for (const account of accounts) {
    const existing = grouped.get(account.accountType) || [];
    existing.push(account);
    grouped.set(account.accountType, existing);
  }

  // Remove empty groups
  for (const [type, accts] of grouped) {
    if (accts.length === 0) {
      grouped.delete(type);
    }
  }

  return grouped;
}

export function getPaymentCounterparty(payment: Payment): string {
  // Try specific counterparty info first (API returns display_name and iban)
  const counterparty =
    payment.counterparty_alias?.display_name ||
    payment.counterparty_alias?.name ||
    payment.label_monetary_account?.display_name ||
    payment.counterparty_alias?.iban ||
    payment.counterparty_alias?.value ||
    payment.description;

  if (counterparty) return counterparty;

  // For internal transfers without counterparty info, show direction
  const isIncoming = parseFloat(payment.amount.value) > 0;
  if (payment.type === "PAYMENT" || payment.type === "BUNQ") {
    return isIncoming ? "Deposit" : "Withdrawal";
  }

  return payment.sub_type || payment.type || "Transfer";
}
