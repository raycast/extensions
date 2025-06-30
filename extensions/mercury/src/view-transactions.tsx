import { useState, useEffect } from "react";
import { ActionPanel, Action, Icon, List, showToast, Toast, getPreferenceValues, Color, Image } from "@raycast/api";
import { getFavicon, getAvatarIcon } from "@raycast/utils";
import fetch from "node-fetch";

interface Preferences {
  apiKey: string;
}

const API_BASE_URL = "https://api.mercury.com/api/v1/";

interface Account {
  id: string;
  name: string;
  currentBalance: number;
  kind: string;
  nickname: string | null;
  accountNumber: string;
  routingNumber: string;
  status: "active" | "deleted" | "pending" | "archived";
}

interface Transaction {
  id: string;
  amount: number;
  counterpartyName: string;
  createdAt: string;
  status: "pending" | "sent" | "cancelled" | "failed";
  kind: string;
  note: string | null;
  externalMemo: string | null;
  dashboardLink: string;
}

interface TransactionResponse {
  total: number;
  transactions: Transaction[];
}

function TransactionTypeDropdown({ onTypeChange }: { onTypeChange: (newValue: string) => void }) {
  const transactionTypes = [
    { id: "all", name: "All Transactions" },
    { id: "externalTransfer", name: "External Transfer" },
    { id: "internalTransfer", name: "Internal Transfer" },
    { id: "outgoingPayment", name: "Outgoing Payment" },
    { id: "creditCardCredit", name: "Credit Card Credit" },
    { id: "creditCardTransaction", name: "Credit Card Transaction" },
    { id: "debitCardTransaction", name: "Debit Card Transaction" },
    { id: "incomingDomesticWire", name: "Incoming Domestic Wire" },
    { id: "incomingInternationalWire", name: "Incoming International Wire" },
    { id: "checkDeposit", name: "Check Deposit" },
    { id: "treasuryTransfer", name: "Treasury Transfer" },
    { id: "wireFee", name: "Wire Fee" },
    { id: "other", name: "Other" },
  ];

  return (
    <List.Dropdown tooltip="Filter by Transaction Type" storeValue={true} onChange={onTypeChange}>
      {transactionTypes.map((type) => (
        <List.Dropdown.Item key={type.id} title={type.name} value={type.id} />
      ))}
    </List.Dropdown>
  );
}

function AccountStatusDropdown({ onStatusChange }: { onStatusChange: (newValue: string) => void }) {
  const statuses = [
    { id: "all", name: "All Statuses" },
    { id: "active", name: "Active" },
    { id: "pending", name: "Pending" },
    { id: "archived", name: "Archived" },
    { id: "deleted", name: "Deleted" },
  ];

  return (
    <List.Dropdown tooltip="Filter by Account Status" storeValue={true} onChange={onStatusChange}>
      {statuses.map((status) => (
        <List.Dropdown.Item key={status.id} title={status.name} value={status.id} />
      ))}
    </List.Dropdown>
  );
}

export default function Command() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(false);
  const { apiKey } = getPreferenceValues<Preferences>();
  const [searchText, setSearchText] = useState("");
  const [selectedTransactionType, setSelectedTransactionType] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (selectedAccountId) {
      fetchTransactions(selectedAccountId);
    }
  }, [selectedAccountId]);

  async function fetchAccounts() {
    try {
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      };

      const response = await fetch(`${API_BASE_URL}/accounts`, options);

      if (!response.ok) {
        throw new Error(`Failed to fetch accounts: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as { accounts: Account[] };
      setAccounts(data.accounts);
    } catch (error) {
      console.error("Error fetching accounts:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch accounts",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function fetchTransactions(accountId: string) {
    setIsLoadingTransactions(true);
    setTransactions([]);
    try {
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
      };

      const response = await fetch(`${API_BASE_URL}/account/${accountId}/transactions?limit=500`, options);

      if (!response.ok) {
        throw new Error(`Failed to fetch transactions: ${response.status} ${response.statusText}`);
      }

      const data = (await response.json()) as TransactionResponse;
      if (!data.transactions || !Array.isArray(data.transactions)) {
        throw new Error("Invalid transactions data structure");
      }

      setTransactions(data.transactions);
    } catch (error) {
      console.error("Error fetching transactions:", error);
      showToast({
        style: Toast.Style.Failure,
        title: "Failed to fetch transactions",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      setIsLoadingTransactions(false);
    }
  }

  const filteredTransactions = transactions.filter(
    (transaction) =>
      (selectedTransactionType === "all" || transaction.kind === selectedTransactionType) &&
      (transaction.counterpartyName.toLowerCase().includes(searchText.toLowerCase()) ||
        transaction.note?.toLowerCase().includes(searchText.toLowerCase()) ||
        transaction.externalMemo?.toLowerCase().includes(searchText.toLowerCase())),
  );

  const handleTransactionTypeChange = (newValue: string) => {
    setSelectedTransactionType(newValue);
  };

  const filteredAccounts = accounts.filter((account) => selectedStatus === "all" || account.status === selectedStatus);

  if (!selectedAccountId) {
    return (
      <List
        isLoading={isLoading}
        searchBarPlaceholder="Select an account..."
        searchBarAccessory={<AccountStatusDropdown onStatusChange={setSelectedStatus} />}
      >
        {filteredAccounts.map((account) => {
          const capitalizedKind = account.kind.charAt(0).toUpperCase() + account.kind.slice(1);
          const statusIcon = getStatusIcon(account.status);
          return (
            <List.Item
              key={account.id}
              icon={Icon.BankNote}
              title={account.nickname || account.name}
              subtitle={
                account.nickname
                  ? `${account.name} - ${formatCurrency(account.currentBalance)}`
                  : `${formatCurrency(account.currentBalance)}`
              }
              accessories={[
                {
                  icon: statusIcon,
                  tooltip: account.status.charAt(0).toUpperCase() + account.status.slice(1),
                },
                {
                  tag: {
                    value: capitalizedKind,
                    color: account.kind.toLowerCase() === "checking" ? Color.Blue : Color.Green,
                  },
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    icon={Icon.List}
                    title="View Transactions"
                    onAction={() => setSelectedAccountId(account.id)}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.CopyClipboard}
                    title="Copy Account Number"
                    content={account.accountNumber}
                    shortcut={{ modifiers: ["cmd"], key: "." }}
                  />
                  <Action.CopyToClipboard
                    icon={Icon.CopyClipboard}
                    title="Copy Routing Number"
                    content={account.routingNumber}
                    shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
                  />
                </ActionPanel>
              }
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label title="Account Name" text={account.name} />
                      <List.Item.Detail.Metadata.Label title="Balance" text={formatCurrency(account.currentBalance)} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label title="Account Number" text={account.accountNumber} />
                      <List.Item.Detail.Metadata.Label title="Routing Number" text={account.routingNumber} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.TagList title="Account Type">
                        <List.Item.Detail.Metadata.TagList.Item
                          text={capitalizedKind}
                          color={account.kind.toLowerCase() === "checking" ? Color.Blue : Color.Green}
                        />
                      </List.Item.Detail.Metadata.TagList>
                      <List.Item.Detail.Metadata.Label
                        title="Status"
                        text={account.status.charAt(0).toUpperCase() + account.status.slice(1)}
                      />
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })}
      </List>
    );
  }

  return (
    <List
      isLoading={isLoadingTransactions}
      onSearchTextChange={setSearchText}
      searchBarPlaceholder="Search transactions..."
      throttle
      searchBarAccessory={<TransactionTypeDropdown onTypeChange={handleTransactionTypeChange} />}
    >
      {filteredTransactions.map((transaction) => (
        <TransactionListItem key={transaction.id} transaction={transaction} />
      ))}
    </List>
  );
}

function TransactionListItem({ transaction }: { transaction: Transaction }) {
  const formattedAmount = formatCurrency(Math.abs(transaction.amount));
  const amountColor = transaction.amount < 0 ? Color.Red : Color.Green;
  const statusIcon = getStatusIcon(transaction.status);
  const statusTooltip = transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1);

  return (
    <List.Item
      icon={getAvatarIcon(transaction.counterpartyName, { background: getTransactionColor(transaction.kind) })}
      title={transaction.counterpartyName}
      subtitle={transaction.note || transaction.externalMemo || ""}
      accessories={[
        { text: { value: formattedAmount, color: amountColor } },
        { date: new Date(transaction.createdAt) },
        { icon: statusIcon, tooltip: statusTooltip },
      ]}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            icon={getFavicon("https://mercury.com")}
            title="Open in Mercury Dashboard"
            url={transaction.dashboardLink}
          />
          <Action.CopyToClipboard
            title="Copy Transaction Id"
            content={transaction.id}
            shortcut={{ modifiers: ["cmd"], key: "." }}
          />
          <Action.CopyToClipboard
            title="Copy Amount"
            content={formattedAmount}
            shortcut={{ modifiers: ["cmd", "shift"], key: "." }}
          />
        </ActionPanel>
      }
    />
  );
}

function getTransactionColor(kind: string): string {
  switch (kind) {
    case "externalTransfer":
    case "internalTransfer":
      return "#4A90E2"; // Blue
    case "outgoingPayment":
      return "#D0021B"; // Red
    case "creditCardCredit":
    case "creditCardTransaction":
    case "debitCardTransaction":
      return "#7ED321"; // Green
    case "incomingDomesticWire":
    case "incomingInternationalWire":
      return "#F5A623"; // Orange
    case "checkDeposit":
      return "#9013FE"; // Purple
    default:
      return "#4A4A4A"; // Dark Gray
  }
}

function getStatusIcon(status: string): Image.ImageLike {
  switch (status) {
    case "active":
    case "sent":
      return { source: Icon.CheckCircle, tintColor: Color.Green };
    case "pending":
      return { source: Icon.CircleProgress, tintColor: Color.Blue };
    case "archived":
    case "cancelled":
      return { source: Icon.Stop, tintColor: Color.Orange };
    case "deleted":
    case "failed":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return Icon.QuestionMark;
  }
}

function formatCurrency(amount: number): string {
  return amount.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
