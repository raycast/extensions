import { accountName } from "./format";
import type { FinancialAccount } from "./types";

export function accountDetails(account: FinancialAccount): [string, string][] {
  const fields: [string, string | null | undefined][] = [
    ["Account", accountName(account)],
    ["Institution", account.financial_connection?.institution?.name],
    ["Account Holder", account.owner_name],
    ["Account Number (BBAN)", account.bban],
    ["IBAN", account.iban],
    ["BIC / SWIFT", account.bic],
    ["Sort Code and Account Number", account.scan],
    ["Masked Account Number", account.account_number_masked],
    ["Currency", account.currency],
    ["Account Type", account.cash_account_type],
    ["Product", account.product_name],
  ];
  return fields.filter(
    (field): field is [string, string] => typeof field[1] === "string" && field[1].trim().length > 0,
  );
}

export function accountDetailsText(account: FinancialAccount): string {
  return accountDetails(account)
    .map(([label, value]) => `${label}: ${value}`)
    .join("\n");
}
