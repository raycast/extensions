export const API_BASE_URL = "https://api.mercury.com/api/v1";

export const STORAGE_KEYS = {
  ACCOUNTS: "mercury-stored-accounts",
  ACTIVE_ACCOUNT_ID: "mercury-active-account-id",
} as const;

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  posted: "Posted",
  processing: "Processing",
  sent: "Sent",
  cancelled: "Cancelled",
  failed: "Failed",
  completed: "Completed",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ach: "ACH",
  check: "Check",
  domesticWire: "Domestic Wire",
  internationalWire: "International Wire",
  debitCard: "Debit Card",
  creditCard: "Credit Card",
  internal: "Internal",
};

export const CARD_STATUS_LABELS: Record<string, string> = {
  active: "Active",
  frozen: "Frozen",
  cancelled: "Cancelled",
  inactive: "Inactive",
  expired: "Expired",
  suspended: "Suspended",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  Unpaid: "Unpaid",
  Paid: "Paid",
  Cancelled: "Cancelled",
  Processing: "Processing",
};

export const ACCOUNT_KIND_LABELS: Record<string, string> = {
  checking: "Checking",
  savings: "Savings",
  mercury: "Mercury",
};

export const WEBHOOK_EVENTS = [
  "transaction.created",
  "transaction.updated",
  "checkingAccount.balance.updated",
  "savingsAccount.balance.updated",
  "treasuryAccount.balance.updated",
  "investmentAccount.balance.updated",
  "creditAccount.balance.updated",
] as const;