import { Action, ActionPanel, Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useMemo, useState } from "react";
import { currency } from "../helpers/currency-format";
import { downloadCSV } from "../helpers/download-csv";
import { getTransactionsWithInitiator } from "../helpers/get-transaction-with-initiator";
import { useMemberships } from "../hooks/use-memberships";
import { useOrganization } from "../hooks/use-organization";
import { useTransactions } from "../hooks/use-transactions";
import { TransactionWithInitiator } from "../types/transaction-initiator";
import { TransactionItem } from "./transaction-item";

const FilterTransactions = {
  "all-transactions": "All Transactions",
  "no-attachment": "No Attachment",
};

type Filters = {
  iban?: string;
  transactions: keyof typeof FilterTransactions;
};

type Props = {
  iban?: string;
};

export function TransactionsList(props: Props) {
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({
    iban: props.iban ?? "",
    transactions: "all-transactions",
  });

  const { memberships, membershipsLoading } = useMemberships();
  const { organization, organizationLoading, organizationError } = useOrganization();
  const { transactions, transactionsMeta, transactionsError, transactionsLoading, transactionsMutate } =
    useTransactions(
      {
        iban: filters.iban ?? organization?.bank_accounts[0].iban ?? "?",
      },
      {
        execute: !!organization && !!memberships && !!filters.iban,
      }
    );

  /** apply filters and group data */
  const transactionsFiltered: {
    byList: TransactionWithInitiator[];
    byMonth: Record<string, TransactionWithInitiator[]>;
  } = useMemo(() => {
    const transactionsSearched = search
      ? transactions.filter((t) => t.label.toLowerCase().includes(search.toLowerCase()))
      : transactions;

    const transactionsFiltered =
      filters.transactions === "no-attachment"
        ? transactionsSearched.filter((t) => t.attachment_ids.length === 0)
        : transactionsSearched;

    const transactionsByList = getTransactionsWithInitiator(transactionsFiltered, memberships);
    const transactionsByMonth = transactionsByList.reduce((acc, transaction) => {
      const date = new Date(transaction.transaction.settled_at);
      const period = date.toLocaleString("default", {
        month: "long",
        year: "numeric",
      });
      acc[period] = acc[period] || [];
      acc[period].push(transaction);
      return acc;
    }, {} as Record<string, TransactionWithInitiator[]>);

    return {
      byList: transactionsByList,
      byMonth: transactionsByMonth,
    };
  }, [transactions, memberships, filters, search]);

  /** helpers */
  const balance = useMemo(() => {
    return transactionsFiltered.byList.reduce((total, { transaction }) => {
      return transaction.side === "credit" ? total + transaction.amount : total - transaction.amount;
    }, 0);
  }, [transactionsFiltered.byList]);
  const isLoading = organizationLoading || transactionsLoading || membershipsLoading;
  const navigationTitle = search ? `Balance: ${currency.format(balance)}` : "Search Transactions";

  return (
    <List
      isLoading={isLoading}
      navigationTitle={navigationTitle}
      searchText={search}
      onSearchTextChange={setSearch}
      throttle={true}
      searchBarPlaceholder={`Search for transactions...`}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Change Bank Account"
          value={filters.iban}
          onChange={(iban) => setFilters((f) => ({ ...f, iban }))}
        >
          {organization?.bank_accounts.map(({ iban, name }) => (
            <List.Dropdown.Item key={iban} value={iban} title={name} />
          ))}
        </List.Dropdown>
      }
    >
      {(organizationError || transactionsError) && (
        <List.EmptyView
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
          title="Error"
          description={organizationError?.message ?? transactionsError?.message}
        />
      )}

      {Object.entries(transactionsFiltered.byMonth).map(([period, transactions]) => (
        <List.Section key={period} title={period}>
          {transactions.map(({ transaction, initiator }, index) => (
            <TransactionItem
              key={index}
              transaction={transaction}
              initiator={initiator}
              actions={
                <ActionPanel>
                  <ActionPanel.Section title="Transactions">
                    <Action
                      icon={Icon.Cloud}
                      title="Fetch More"
                      onAction={async () => {
                        if (transactionsMeta.next_page) {
                          await transactionsMutate({
                            iban: filters.iban ?? organization?.bank_accounts[0].iban ?? "?",
                            current_page: transactionsMeta.next_page,
                          });
                          await showToast({
                            style: Toast.Style.Success,
                            title: "Got more transactions",
                          });
                        } else {
                          await showToast({
                            style: Toast.Style.Failure,
                            title: "No more transactions available",
                          });
                        }
                      }}
                    />
                    <Action
                      icon={Icon.Download}
                      title="Download as CSV"
                      shortcut={{ modifiers: ["cmd"], key: "d" }}
                      onAction={() => {
                        downloadCSV(transactionsFiltered.byList);
                      }}
                    />
                  </ActionPanel.Section>
                  <ActionPanel.Section title="Filters">
                    <Action
                      icon={{ source: Icon.List, tintColor: Color.SecondaryText }}
                      title="All Transactions"
                      shortcut={{ modifiers: ["cmd"], key: "arrowLeft" }}
                      onAction={() => {
                        setFilters((f) => ({ ...f, transactions: "all-transactions" }));
                      }}
                    />
                    <Action
                      icon={Icon.Paperclip}
                      title="No Attachment"
                      shortcut={{ modifiers: ["cmd"], key: "arrowRight" }}
                      onAction={() => {
                        setFilters((f) => ({ ...f, transactions: "no-attachment" }));
                      }}
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
          ))}
        </List.Section>
      ))}
    </List>
  );
}
