import { ActionPanel, List, Action, getPreferenceValues, Icon } from "@raycast/api";

import { bankGetAccounts, bankGetAccountTransactions, BankType } from "./api/bank";
import { systemGetAccountDetails } from "./api/system";
import { accountPath, iconPath } from "./api/urls";

import { formatCurrency } from "./utils/formatting";
import { useAsyncData } from "./utils/hooks";
import { unique } from "./utils/data";
import AccountDetail from "./views/AccountDetail";

const bankTypePriority: Record<BankType, number> = {
  CURRENT: 100,
  PETTY: 80,
  BUILDINGSOC: 70,
  CREDITCARD: 60,
  LOAN: 50,
  MERCHANT: 30,
  RESERVE: 20,
  EQUITY: 10,
};

const bankTypeNames: Record<BankType, string> = {
  CURRENT: "Current accounts",
  PETTY: "Petty cash",
  BUILDINGSOC: "Building societies",
  LOAN: "Loan",
  MERCHANT: "Merchant account",
  EQUITY: "Equity",
  CREDITCARD: "Credit cards",
  RESERVE: "Reserve",
};

export default function Command() {
  const { accountNumber } = getPreferenceValues();

  const domain = useAsyncData(accountNumber && "slug", () =>
    systemGetAccountDetails(accountNumber, ["ClientDomain"]).then((r) => r.ClientDomain)
  );

  const accounts = useAsyncData(accountNumber && "accounts", () => bankGetAccounts(), []);

  const bankCodes = accounts.data.map((a) => a.NominalCode);
  const transactions = useAsyncData(
    bankCodes,
    (codes) => Promise.all(codes.map((code) => bankGetAccountTransactions(code, { number: 20 }))),
    []
  );

  const accountTypes = unique(accounts.data.map((a) => a.BankType)).sort(
    (a, b) => (bankTypePriority[b] || 0) - (bankTypePriority[a] || 0)
  );

  const error = accounts.error || transactions.error;

  return (
    <List isLoading={!error && (domain.loading || accounts.loading || transactions.loading)}>
      <List.EmptyView
        icon={{ source: "icon-64px.png" }}
        title={error ? "Error Loading Accounts" : "No Accounts to Display"}
      />
      {accountTypes.map((type) => (
        <List.Section title={bankTypeNames[type] || type} key={type}>
          {accounts.data
            .filter((a) => a.BankType === type)
            .map((account) => {
              const needsReconsent = !!account.OpenBankingConsents?.every(
                (c) => new Date(c.ExpiryDate).valueOf() < new Date().setHours(24 * 7)
              );
              const details = transactions.data.find((t) => t.NominalCode === account.NominalCode);
              const balance = formatCurrency(details?.MetaData.CurrentBalance, details?.MetaData.Currency);
              const url = accountPath(domain.data, account.BankId);
              return (
                <List.Item
                  icon={iconPath(account.LogoPath, "doc-plaintext-16")}
                  key={`${account.NominalCode}-${balance}`}
                  subtitle={
                    needsReconsent ? { value: "⚠", tooltip: "Needs to renew Open Banking consent." } : undefined
                  }
                  title={account.Name}
                  accessories={[{ text: balance }]}
                  actions={
                    <ActionPanel>
                      {!!details && (
                        <Action.Push
                          title="Account Details"
                          icon={Icon.List}
                          target={<AccountDetail transactions={details} url={url} />}
                        />
                      )}
                      {!!url && <Action.OpenInBrowser url={url} />}
                    </ActionPanel>
                  }
                />
              );
            })}
        </List.Section>
      ))}
    </List>
  );
}
