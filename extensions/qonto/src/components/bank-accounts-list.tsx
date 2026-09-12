import { useMemo, useState } from "react";
import { Icon, List, ActionPanel, Action, Color, useNavigation, Detail } from "@raycast/api";
import { currency } from "../helpers/currency-format";
import { useOrganization } from "../hooks/use-organization";
import { BankAccount } from "../types/bank-account";
import { TransactionsList } from "./transactions-list";
import { datetime } from "../helpers/datetime-format";

type Filters = {
  status: BankAccount["status"];
};

type Filtered = {
  total: number;
  accounts: BankAccount[];
};

const IconAccountActive = {
  source: Icon.Building,
  tintColor: Color.PrimaryText,
};

const IconAccountClosed = {
  source: Icon.Building,
  tintColor: Color.Red,
};

export function AccountsList() {
  const { push } = useNavigation();
  const { organization, organizationLoading, organizationError } = useOrganization();

  const [details, setDetails] = useState<boolean>(false);
  const [filters, setFilters] = useState<Filters>({ status: "active" });

  const filtered = useMemo<Filtered>(() => {
    if (!organization)
      return {
        total: 0,
        accounts: [],
      };

    const accounts = organization.bank_accounts.filter((account) => account.status === filters.status);
    const total = accounts.reduce((total, account) => total + account.balance, 0);

    return {
      total,
      accounts,
    };
  }, [organization, filters]);

  return (
    <List
      isLoading={organizationLoading}
      isShowingDetail={details}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Status"
          value={filters.status}
          onChange={(status) => setFilters({ status: status as BankAccount["status"] })}
        >
          <List.Dropdown.Section>
            <List.Dropdown.Item value="active" title="Active Bank Accounts" icon={IconAccountActive} />
            <List.Dropdown.Item value="closed" title="Closed Bank Accounts" icon={IconAccountClosed} />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {organizationError && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={organizationError.message}
        />
      )}

      {!organizationError &&
        filtered.accounts.map((account) => {
          const accountIcon =
            account.status === "active"
              ? { value: IconAccountActive, tooltip: "Bank Account Active" }
              : { value: IconAccountClosed, tooltip: "Bank Account Closed" };

          const props: Partial<List.Item.Props> = !details
            ? {
                accessories: [{ text: `${currency.format(account.balance)}` }],
              }
            : {
                detail: (
                  <List.Item.Detail
                    markdown={`
                + ----- + --------------------------- +
                | Bank  | Qonto                       |
                | ----- | --------------------------- |
                | IBAN  | ${account.iban} |        
                | ----- | --------------------------- |
                | BIC   | ${account.bic}                 |
                + ----- + --------------------------- +
                `}
                    metadata={
                      <Detail.Metadata>
                        <Detail.Metadata.Label title="Name" text={account.name} />
                        <Detail.Metadata.Label title="Balance" text={currency.format(account.balance)} />
                        <Detail.Metadata.Label title="Currency" text={account.currency} />
                        <Detail.Metadata.Label title="Status" text={account.status} />
                        <Detail.Metadata.Label title="Updated at" text={datetime.format(account.updated_at)} />
                      </Detail.Metadata>
                    }
                  />
                ),
              };

          return (
            <List.Item
              key={account.slug}
              title={account.name}
              icon={accountIcon}
              {...props}
              actions={
                <ActionPanel title={account.name}>
                  <Action icon={Icon.Document} title="Show IBAN" onAction={() => setDetails(!details)} />
                  <Action
                    icon={Icon.MagnifyingGlass}
                    title="Search Transactions"
                    onAction={() => {
                      push(<TransactionsList iban={account.iban} />);
                    }}
                  />

                  <ActionPanel.Section>
                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title="Copy IBAN"
                      shortcut={{ modifiers: ["cmd"], key: "i" }}
                      content={`Bank: Qonto\nIBAN: ${account.iban}\nBIC:  ${account.bic}`}
                    />

                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title="Copy Balance"
                      shortcut={{ modifiers: ["cmd"], key: "b" }}
                      content={currency.format(account.balance)}
                    />

                    <Action.CopyToClipboard
                      icon={Icon.CopyClipboard}
                      title="Copy Total"
                      shortcut={{ modifiers: ["cmd"], key: "t" }}
                      content={currency.format(filtered.total)}
                    />
                  </ActionPanel.Section>

                  <ActionPanel.Section>
                    <Action.OpenInBrowser
                      url={`https://app.qonto.com/organizations/${organization?.slug}/transactions`}
                      shortcut={{ modifiers: ["shift", "cmd"], key: "enter" }}
                    />
                  </ActionPanel.Section>
                </ActionPanel>
              }
            />
          );
        })}
    </List>
  );
}
