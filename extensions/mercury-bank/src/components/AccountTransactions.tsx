import { Icon, List } from "@raycast/api";
import { useState } from "react";
import { EmptyView } from "./EmptyView";
import {
  TransactionListItem,
  groupTransactionsByDate,
} from "./TransactionListItem";
import { useTransactions } from "../lib/hooks/useTransactions";
import type { MercuryAccount } from "../lib/types";

const ACTIVE_STATUSES = new Set(["pending", "sent", "processing"]);
const DONE_STATUSES = new Set(["completed", "posted"]);

interface AccountTransactionsProps {
  apiKey: string;
  account: MercuryAccount;
  accountName: string;
}

export function AccountTransactions({
  apiKey,
  account,
  accountName,
}: AccountTransactionsProps) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showDetail, setShowDetail] = useState(true);
  const toggleDetail = () => setShowDetail((v) => !v);

  const isSingleStatus =
    statusFilter !== "all" &&
    statusFilter !== "active" &&
    statusFilter !== "done";

  const { data: transactions, isLoading } = useTransactions(
    apiKey,
    account.id,
    {
      limit: 100,
      ...(searchText ? { search: searchText } : {}),
      ...(isSingleStatus ? { status: statusFilter } : {}),
    },
  );

  const filtered = (transactions ?? []).filter((tx) => {
    if (statusFilter === "active") return ACTIVE_STATUSES.has(tx.status);
    if (statusFilter === "done") return DONE_STATUSES.has(tx.status);
    return true;
  });

  const grouped = groupTransactionsByDate(filtered);
  const label = account.nickname || account.name || "Account";

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={`Mercury - ${accountName} - ${label}`}
      searchBarPlaceholder={`Search ${label} transactions...`}
      onSearchTextChange={setSearchText}
      throttle
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Status"
          storeValue
          onChange={setStatusFilter}
        >
          <List.Dropdown.Section title="Quick Filters">
            <List.Dropdown.Item
              title="Active"
              value="active"
              icon={Icon.Bolt}
            />
            <List.Dropdown.Item
              title="Completed"
              value="done"
              icon={Icon.CheckCircle}
            />
            <List.Dropdown.Item
              title="All Statuses"
              value="all"
              icon={Icon.List}
            />
          </List.Dropdown.Section>
          <List.Dropdown.Section title="By Status">
            <List.Dropdown.Item
              title="Pending"
              value="pending"
              icon={Icon.Clock}
            />
            <List.Dropdown.Item title="Sent" value="sent" icon={Icon.ArrowUp} />
            <List.Dropdown.Item
              title="Processing"
              value="processing"
              icon={Icon.CircleProgress}
            />
            <List.Dropdown.Item
              title="Posted"
              value="posted"
              icon={Icon.CheckCircle}
            />
            <List.Dropdown.Item
              title="Failed"
              value="failed"
              icon={Icon.XMarkCircle}
            />
            <List.Dropdown.Item
              title="Cancelled"
              value="cancelled"
              icon={Icon.MinusCircle}
            />
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {!isLoading && filtered.length === 0 && (
        <EmptyView
          title="No Transactions"
          description={
            searchText
              ? "No transactions match your search"
              : "No transactions found for this account"
          }
          icon={Icon.BankNote}
        />
      )}
      {Array.from(grouped.entries()).map(([date, txns]) => (
        <List.Section
          key={date}
          title={date}
          subtitle={`${txns.length} transactions`}
        >
          {txns.map((tx) => (
            <TransactionListItem
              key={tx.id}
              transaction={tx}
              showDetail={showDetail}
              showAccountActions={false}
              toggleDetail={toggleDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}