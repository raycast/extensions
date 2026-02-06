import { Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useState } from "react";
import { FeatureGuard } from "./components/FeatureGuard";
import { EmptyView } from "./components/EmptyView";
import {
  TransactionListItem,
  groupTransactionsByDate,
} from "./components/TransactionListItem";
import { useAllTransactions } from "./lib/hooks/useTransactions";
import type { TransactionFilters } from "./lib/types";

const ACTIVE_STATUSES = new Set(["pending", "sent", "processing"]);
const DONE_STATUSES = new Set(["completed", "posted"]);

export default function ViewTransactions() {
  return (
    <FeatureGuard feature="transactions">
      {(apiKey, accountName) => (
        <TransactionsList apiKey={apiKey} accountName={accountName} />
      )}
    </FeatureGuard>
  );
}

function TransactionsList({
  apiKey,
  accountName,
}: {
  apiKey: string;
  accountName: string;
}) {
  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [showDetail, setShowDetail] = useState(true);
  const toggleDetail = () => setShowDetail((v) => !v);

  // Only pass single-status filters to the API; compound filters are handled client-side
  const isSingleStatus =
    statusFilter !== "all" &&
    statusFilter !== "active" &&
    statusFilter !== "done";

  const filters: TransactionFilters = {
    limit: 100,
    ...(searchText ? { search: searchText } : {}),
    ...(isSingleStatus ? { status: statusFilter } : {}),
  };

  const {
    data: transactions,
    isLoading,
    error,
  } = useAllTransactions(apiKey, filters);

  useEffect(() => {
    if (error) {
      console.error("[View Transactions] Error:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to load transactions",
        message: String(error),
      });
    }
  }, [error]);

  const filtered = (transactions ?? []).filter((tx) => {
    if (statusFilter === "active") return ACTIVE_STATUSES.has(tx.status);
    if (statusFilter === "done") return DONE_STATUSES.has(tx.status);
    return true;
  });

  const grouped = groupTransactionsByDate(filtered);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail={showDetail}
      navigationTitle={`Mercury - ${accountName}`}
      searchBarPlaceholder="Search transactions..."
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
              : "No transactions found"
          }
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
              toggleDetail={toggleDetail}
            />
          ))}
        </List.Section>
      ))}
    </List>
  );
}