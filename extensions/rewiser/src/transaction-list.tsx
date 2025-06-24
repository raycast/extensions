import { Detail, ActionPanel, Action, showToast, Toast, List, Icon, Color } from "@raycast/api";
import { useEffect, useState } from "react";
import { getValidToken } from "./utils/auth";
import LoginForm from "./components/LoginForm";

interface Folder {
  key: string;
  label: string;
  currency: string;
}

interface Transaction {
  id: string;
  name: string;
  amount: number;
  type: "Expense" | "Income";
  planned_date: string;
  created_at: string;
  is_paid: boolean;
  note?: string;
}

export default function Command() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [currentView, setCurrentView] = useState<"folders" | "transactions">("folders");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [searchText, setSearchText] = useState<string>("");

  // Filter transactions based on search text
  const filteredTransactions = transactions.filter((transaction) => {
    if (!searchText.trim()) return true;

    const searchLower = searchText.toLowerCase();
    return (
      transaction.name.toLowerCase().includes(searchLower) ||
      (transaction.note && transaction.note.toLowerCase().includes(searchLower)) ||
      transaction.amount.toString().includes(searchLower) ||
      transaction.type.toLowerCase().includes(searchLower)
    );
  });

  useEffect(() => {
    async function init() {
      try {
        const t = await getValidToken();
        setToken(t);
        await fetchFolders(t);
      } catch {
        setToken(null);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  useEffect(() => {
    const fetchCurrentMonthTransactions = async () => {
      if (!selectedFolder || !token) return;

      setLoadingTransactions(true);
      const now = new Date();
      const currentMonth = now.getMonth() + 1;
      const currentYear = now.getFullYear();

      try {
        const [expensesRes, incomeRes] = await Promise.all([
          fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/get-transactions-raycast", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              folder_id: selectedFolder,
              month: currentMonth,
              year: currentYear,
              type: "Expense",
              limit: 100,
            }),
          }),
          fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/get-transactions-raycast", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              folder_id: selectedFolder,
              month: currentMonth,
              year: currentYear,
              type: "Income",
              limit: 100,
            }),
          }),
        ]);

        const expensesData = (await expensesRes.json()) as { success: boolean; data?: Transaction[] };
        const incomeData = (await incomeRes.json()) as { success: boolean; data?: Transaction[] };

        const allTransactions: Transaction[] = [
          ...(expensesData.success && expensesData.data ? expensesData.data : []),
          ...(incomeData.success && incomeData.data ? incomeData.data : []),
        ];

        allTransactions.sort((a, b) => new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime());
        setTransactions(allTransactions);
      } finally {
        setLoadingTransactions(false);
      }
    };

    if (selectedFolder && token) {
      fetchCurrentMonthTransactions();
    }
  }, [selectedFolder, token]);

  const fetchFolders = async (authToken: string) => {
    try {
      const response = await fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/get-folders", {
        headers: { Authorization: `Bearer ${authToken}` },
      });
      const foldersData = (await response.json()) as Folder[];
      setFolders(foldersData);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading folders",
      });
    }
  };

  const refreshTransactions = async () => {
    if (!selectedFolder || !token) return;

    setLoadingTransactions(true);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
      const [expensesRes, incomeRes] = await Promise.all([
        fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/get-transactions-raycast", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folder_id: selectedFolder,
            month: currentMonth,
            year: currentYear,
            type: "Expense",
            limit: 100,
          }),
        }),
        fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/get-transactions-raycast", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            folder_id: selectedFolder,
            month: currentMonth,
            year: currentYear,
            type: "Income",
            limit: 100,
          }),
        }),
      ]);

      const expensesData = (await expensesRes.json()) as { success: boolean; data?: Transaction[] };
      const incomeData = (await incomeRes.json()) as { success: boolean; data?: Transaction[] };

      const allTransactions: Transaction[] = [
        ...(expensesData.success && expensesData.data ? expensesData.data : []),
        ...(incomeData.success && incomeData.data ? incomeData.data : []),
      ];

      allTransactions.sort((a, b) => new Date(b.planned_date).getTime() - new Date(a.planned_date).getTime());
      setTransactions(allTransactions);
    } catch {
      await showToast({
        style: Toast.Style.Failure,
        title: "Error loading transactions",
      });
    } finally {
      setLoadingTransactions(false);
    }
  };

  const updateTransaction = async (transactionId: string, action: "toggle" | "delete") => {
    const toast = await showToast({
      style: Toast.Style.Animated,
      title: action === "toggle" ? "Updating status..." : "Deleting...",
    });

    try {
      const response = await fetch("https://nzkqapsaeatytqrnitpj.supabase.co/functions/v1/update-transaction-raycast", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          transaction_id: transactionId,
          action: action,
        }),
      });

      const result = (await response.json()) as { success: boolean; data?: { is_paid: boolean }; error?: string };

      if (result.success) {
        if (action === "toggle" && result.data) {
          setTransactions((prev) =>
            prev.map((t) => (t.id === transactionId ? { ...t, is_paid: result.data!.is_paid } : t)),
          );
          toast.style = Toast.Style.Success;
          toast.title = result.data.is_paid ? "Marked as Paid" : "Marked as Planned";
        } else {
          setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
          toast.style = Toast.Style.Success;
          toast.title = "Transaction Deleted";
        }
      } else {
        throw new Error(result.error || "Unknown error");
      }
    } catch (error) {
      toast.style = Toast.Style.Failure;
      toast.title = "Update Failed";
      toast.message = String(error);
    }
  };

  if (loading) return <Detail isLoading={true} />;

  if (!token) {
    return (
      <LoginForm
        onLogin={async () => {
          const newToken = await getValidToken();
          setToken(newToken);
          await fetchFolders(newToken);
        }}
      />
    );
  }

  // Folder selection screen
  if (currentView === "folders") {
    return (
      <List navigationTitle="Select Folder">
        {folders.map((folder) => (
          <List.Item
            key={folder.key}
            title={folder.label}
            subtitle={folder.currency}
            icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title="Select Folder"
                  onAction={() => {
                    setSelectedFolder(folder.key);
                    setCurrentView("transactions");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}
      </List>
    );
  }

  // Transaction list screen
  const selectedFolderInfo = folders.find((f) => f.key === selectedFolder);
  const now = new Date();
  const monthName = now.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  const monthDisplay = `${monthName} Transactions`;

  const filteredExpenses = filteredTransactions.filter((t) => t.type === "Expense");
  const filteredIncome = filteredTransactions.filter((t) => t.type === "Income");

  const totalIncome = transactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
  const currencySymbol = selectedFolderInfo?.currency || "EUR";

  return (
    <List
      navigationTitle={`${selectedFolderInfo?.label} (${selectedFolderInfo?.currency})`}
      searchBarPlaceholder="Search transactions..."
      searchText={searchText}
      onSearchTextChange={setSearchText}
      isLoading={loadingTransactions}
      actions={
        <ActionPanel>
          <Action
            title="Refresh"
            icon={Icon.ArrowClockwise}
            onAction={refreshTransactions}
            shortcut={{ modifiers: ["cmd"], key: "r" }}
          />
          <Action
            title="Back to Folders"
            icon={Icon.ArrowLeft}
            onAction={() => setCurrentView("folders")}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    >
      {/* Current Month Header */}
      {transactions.length > 0 && (
        <List.Section title={monthDisplay}>
          <List.Item
            title="Overview"
            subtitle={
              searchText ? `Showing ${filteredTransactions.length} of ${transactions.length} transactions` : undefined
            }
            icon={Icon.Calendar}
            accessories={[
              {
                text: `Income: ${totalIncome.toLocaleString()} ${currencySymbol} • Expenses: ${totalExpenses.toLocaleString()} ${currencySymbol}`,
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  onAction={refreshTransactions}
                  shortcut={{ modifiers: ["cmd"], key: "r" }}
                />
                <Action
                  title="Back to Folders"
                  icon={Icon.ArrowLeft}
                  onAction={() => setCurrentView("folders")}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Income Section */}
      {filteredIncome.length > 0 && (
        <List.Section title={`💰 Income (${filteredIncome.length})`}>
          {filteredIncome.map((transaction) => (
            <List.Item
              key={transaction.id}
              title={transaction.name}
              subtitle={transaction.note || ""}
              icon={{
                source: transaction.is_paid ? Icon.CheckCircle : Icon.Circle,
                tintColor: transaction.is_paid ? Color.Green : Color.SecondaryText,
              }}
              accessories={[
                {
                  text: `+${transaction.amount} ${selectedFolderInfo?.currency}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={transaction.is_paid ? "Mark as Planned" : "Mark as Paid"}
                    icon={transaction.is_paid ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => updateTransaction(transaction.id, "toggle")}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action
                    title="Delete Transaction"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => updateTransaction(transaction.id, "delete")}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshTransactions}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Expenses Section */}
      {filteredExpenses.length > 0 && (
        <List.Section title={`💸 Expenses (${filteredExpenses.length})`}>
          {filteredExpenses.map((transaction) => (
            <List.Item
              key={transaction.id}
              title={transaction.name}
              subtitle={transaction.note || ""}
              icon={{
                source: transaction.is_paid ? Icon.CheckCircle : Icon.Circle,
                tintColor: transaction.is_paid ? Color.Green : Color.SecondaryText,
              }}
              accessories={[
                {
                  text: `-${transaction.amount} ${selectedFolderInfo?.currency}`,
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={transaction.is_paid ? "Mark as Planned" : "Mark as Paid"}
                    icon={transaction.is_paid ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => updateTransaction(transaction.id, "toggle")}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action
                    title="Delete Transaction"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => updateTransaction(transaction.id, "delete")}
                    shortcut={{ modifiers: ["cmd"], key: "d" }}
                  />
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={refreshTransactions}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                </ActionPanel>
              }
            />
          ))}
        </List.Section>
      )}

      {/* Empty State */}
      {transactions.length === 0 && !loadingTransactions && (
        <List.EmptyView
          title={`No transactions for ${monthName}`}
          description="No transactions found for this month"
          icon={Icon.Calendar}
        />
      )}

      {/* No Search Results */}
      {transactions.length > 0 && filteredTransactions.length === 0 && searchText.trim() && (
        <List.EmptyView
          title="No matching transactions"
          description={`No transactions found for "${searchText}"`}
          icon={Icon.MagnifyingGlass}
        />
      )}
    </List>
  );
}
