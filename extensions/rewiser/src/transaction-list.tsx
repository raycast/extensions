import { Detail, ActionPanel, Action, showToast, Toast, List, Icon, Color, getPreferenceValues } from "@raycast/api";
import { showFailureToast } from "@raycast/utils";
import { useEffect, useState, useCallback } from "react";
import { fetchFolders, fetchMonthTransactions, updateTransaction, ApiError } from "./utils/api";
import { Folder, Transaction, SUCCESS_MESSAGES, ERROR_MESSAGES } from "./utils/types";
import { logger } from "./utils/logger";

interface Preferences {
  personalAccessToken: string;
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

  const initializeAuth = useCallback(async () => {
    try {
      const preferences = getPreferenceValues<Preferences>();
      const personalToken = preferences.personalAccessToken;

      if (!personalToken?.trim()) {
        throw new Error("Personal Access Token is required. Please set it in extension preferences.");
      }

      setToken(personalToken);
      await loadFolders(personalToken);
    } catch (error) {
      logger.error("Initialization error", error);
      setToken(null);
      await showFailureToast(error instanceof Error ? error.message : "Failed to initialize extension");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadFolders = useCallback(async (authToken: string) => {
    try {
      const foldersData = await fetchFolders(authToken);
      setFolders(foldersData);

      // Auto-select if only one folder
      if (foldersData.length === 1) {
        setSelectedFolder(foldersData[0].key);
        setCurrentView("transactions");
      }
    } catch (error) {
      logger.error("Failed to load folders", error);
      // Error is already shown in fetchFolders
    }
  }, []);

  const loadCurrentMonthTransactions = useCallback(async () => {
    if (!selectedFolder || !token) return;

    setLoadingTransactions(true);
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
      const allTransactions = await fetchMonthTransactions(token, selectedFolder, currentMonth, currentYear);
      setTransactions(allTransactions);
    } catch (error) {
      logger.error("Failed to load transactions", error);

      if (error instanceof ApiError) {
        showFailureToast(error, { title: "Error loading transactions" });
      } else {
        showFailureToast(ERROR_MESSAGES.TRANSACTION_LOAD_ERROR, {
          title: "Error loading transactions",
          message: ERROR_MESSAGES.TRANSACTION_LOAD_ERROR,
        });
      }
    } finally {
      setLoadingTransactions(false);
    }
  }, [selectedFolder, token]);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    if (selectedFolder && token && currentView === "transactions") {
      loadCurrentMonthTransactions();
    }
  }, [selectedFolder, token, currentView, loadCurrentMonthTransactions]);

  const handleUpdateTransaction = useCallback(
    async (transactionId: string, action: "toggle" | "delete") => {
      if (!token) {
        await showFailureToast(ERROR_MESSAGES.NO_TOKEN);
        return;
      }

      const toast = await showToast({
        style: Toast.Style.Animated,
        title: action === "toggle" ? "Updating status..." : "Deleting...",
      });

      try {
        const result = await updateTransaction(token, {
          transaction_id: transactionId,
          action: action,
        });

        if (action === "toggle" && result.is_paid !== undefined) {
          setTransactions((prev) => prev.map((t) => (t.id === transactionId ? { ...t, is_paid: result.is_paid! } : t)));
          toast.style = Toast.Style.Success;
          toast.title = result.is_paid ? SUCCESS_MESSAGES.STATUS_PAID : SUCCESS_MESSAGES.STATUS_PLANNED;
        } else if (action === "delete") {
          setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
          toast.style = Toast.Style.Success;
          toast.title = SUCCESS_MESSAGES.TRANSACTION_DELETED;
        }
      } catch (error) {
        toast.style = Toast.Style.Failure;
        toast.title = "Update Failed";

        if (error instanceof ApiError) {
          toast.message = error.message;
        } else {
          toast.message = ERROR_MESSAGES.TRANSACTION_UPDATE_ERROR;
        }

        logger.error("Failed to update transaction", error);
      }
    },
    [token],
  );

  const resetToFolderSelection = useCallback(() => {
    setCurrentView("folders");
    setSelectedFolder("");
    setTransactions([]);
    setSearchText("");
  }, []);

  const refreshTransactions = useCallback(async () => {
    await loadCurrentMonthTransactions();
  }, [loadCurrentMonthTransactions]);

  if (loading) {
    return <Detail isLoading={true} navigationTitle="Loading..." />;
  }

  if (!token) {
    return (
      <Detail
        navigationTitle="Configuration Required"
        markdown={`# Personal Access Token Required
        
Please set your Rewiser Personal Access Token in the extension preferences.
        
1. Open Raycast preferences
2. Go to Extensions → Rewiser
3. Enter your Personal Access Token
        
To get your token:
1. Visit [app.rewiser.io](https://app.rewiser.io)
2. Go to Profile → API Keys
3. Create a new Personal Access Token`}
      />
    );
  }

  // Folder selection screen
  if (currentView === "folders") {
    return (
      <List navigationTitle="Select Folder" isLoading={folders.length === 0}>
        {folders.map((folder) => (
          <List.Item
            key={folder.key}
            title={folder.label}
            subtitle={`Currency: ${folder.currency}`}
            icon={{ source: Icon.Folder, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action
                  title="Select Folder"
                  icon={Icon.ChevronRight}
                  onAction={() => {
                    setSelectedFolder(folder.key);
                    setCurrentView("transactions");
                  }}
                />
              </ActionPanel>
            }
          />
        ))}

        {folders.length === 0 && (
          <List.EmptyView
            title="No folders found"
            description="Please create a folder in your Rewiser account first"
            icon={Icon.ExclamationMark}
          />
        )}
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

  const filteredExpenses = filteredTransactions.filter((t) => t.type === "Expense");
  const filteredIncome = filteredTransactions.filter((t) => t.type === "Income");

  const totalIncome = transactions.filter((t) => t.type === "Income").reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = transactions.filter((t) => t.type === "Expense").reduce((sum, t) => sum + t.amount, 0);
  const currencySymbol = selectedFolderInfo?.currency || "EUR";

  return (
    <List
      navigationTitle={`${selectedFolderInfo?.label || "Unknown"} (${selectedFolderInfo?.currency || ""})`}
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
            onAction={resetToFolderSelection}
            shortcut={{ modifiers: ["cmd"], key: "b" }}
          />
        </ActionPanel>
      }
    >
      {/* Current Month Header */}
      {transactions.length > 0 && (
        <List.Section title={`${monthName} Overview`}>
          <List.Item
            title="Monthly Summary"
            subtitle={
              searchText
                ? `Showing ${filteredTransactions.length} of ${transactions.length} transactions`
                : `${transactions.length} transactions total`
            }
            icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
            accessories={[
              {
                text: `Net: ${(totalIncome - totalExpenses).toLocaleString()} ${currencySymbol}`,
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
                  onAction={resetToFolderSelection}
                  shortcut={{ modifiers: ["cmd"], key: "b" }}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Income vs Expenses"
            subtitle={`Income: ${totalIncome.toLocaleString()} ${currencySymbol} | Expenses: ${totalExpenses.toLocaleString()} ${currencySymbol}`}
            icon={{
              source: totalIncome >= totalExpenses ? Icon.ArrowUp : Icon.ArrowDown,
              tintColor: totalIncome >= totalExpenses ? Color.Green : Color.Red,
            }}
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
                  onAction={resetToFolderSelection}
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
              subtitle={transaction.note || new Date(transaction.planned_date).toLocaleDateString()}
              icon={{
                source: transaction.is_paid ? Icon.CheckCircle : Icon.Circle,
                tintColor: transaction.is_paid ? Color.Green : Color.SecondaryText,
              }}
              accessories={[
                {
                  text: `+${transaction.amount.toLocaleString()} ${selectedFolderInfo?.currency}`,
                  tooltip: transaction.is_paid ? "Paid" : "Planned",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={transaction.is_paid ? "Mark as Planned" : "Mark as Paid"}
                    icon={transaction.is_paid ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => handleUpdateTransaction(transaction.id, "toggle")}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action
                    title="Delete Transaction"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleUpdateTransaction(transaction.id, "delete")}
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
              subtitle={transaction.note || new Date(transaction.planned_date).toLocaleDateString()}
              icon={{
                source: transaction.is_paid ? Icon.CheckCircle : Icon.Circle,
                tintColor: transaction.is_paid ? Color.Green : Color.SecondaryText,
              }}
              accessories={[
                {
                  text: `-${transaction.amount.toLocaleString()} ${selectedFolderInfo?.currency}`,
                  tooltip: transaction.is_paid ? "Paid" : "Planned",
                },
              ]}
              actions={
                <ActionPanel>
                  <Action
                    title={transaction.is_paid ? "Mark as Planned" : "Mark as Paid"}
                    icon={transaction.is_paid ? Icon.Circle : Icon.CheckCircle}
                    onAction={() => handleUpdateTransaction(transaction.id, "toggle")}
                    shortcut={{ modifiers: ["cmd"], key: "t" }}
                  />
                  <Action
                    title="Delete Transaction"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => handleUpdateTransaction(transaction.id, "delete")}
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
          description="No transactions found for this month. Use 'Add Transaction' to create your first entry."
          icon={Icon.Calendar}
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
                onAction={resetToFolderSelection}
                shortcut={{ modifiers: ["cmd"], key: "b" }}
              />
            </ActionPanel>
          }
        />
      )}

      {/* No Search Results */}
      {transactions.length > 0 && filteredTransactions.length === 0 && searchText.trim() && (
        <List.EmptyView
          title="No matching transactions"
          description={`No transactions found for "${searchText}". Try adjusting your search terms.`}
          icon={Icon.MagnifyingGlass}
          actions={
            <ActionPanel>
              <Action
                title="Clear Search"
                icon={Icon.XMarkCircle}
                onAction={() => setSearchText("")}
                shortcut={{ modifiers: ["cmd"], key: "x" }}
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
      )}
    </List>
  );
}
