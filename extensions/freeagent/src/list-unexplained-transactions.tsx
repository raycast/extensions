import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { BankAccount, BankTransaction } from "./types";
import { fetchBankAccounts, fetchBankTransactions } from "./services/freeagent";
import { formatCurrencyAmount, parseDate, getBankTransactionUrl } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const ListUnexplainedTransactions = function Command() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState<string>("");
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const { isLoading, isAuthenticated, accessToken, companyInfo, handleError } = useFreeAgent();

  // Load bank accounts when authenticated
  useEffect(() => {
    async function loadBankAccounts() {
      if (!isAuthenticated || !accessToken) return;

      try {
        const accounts = await fetchBankAccounts(accessToken);
        setBankAccounts(accounts);

        // Auto-select the first bank account if available
        if (accounts.length > 0) {
          setSelectedBankAccount(accounts[0].url);
        }
      } catch (error) {
        handleError(error, "Failed to fetch bank accounts");
      }
    }

    loadBankAccounts();
  }, [isAuthenticated, accessToken, handleError]);

  // Load unexplained transactions when bank account is selected
  useEffect(() => {
    async function loadTransactions() {
      if (!isAuthenticated || !accessToken || !selectedBankAccount) {
        setTransactions([]);
        return;
      }

      setTransactionsLoading(true);
      try {
        const markedForReviewTransactionList = await fetchBankTransactions(
          accessToken,
          selectedBankAccount,
          "marked_for_review",
        );
        const unexplainedTransactionList = await fetchBankTransactions(accessToken, selectedBankAccount, "unexplained");

        const transactionList = [...markedForReviewTransactionList, ...unexplainedTransactionList];

        setTransactions(transactionList);
      } catch (error) {
        handleError(error, "Failed to fetch unexplained transactions");
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    }

    loadTransactions();
  }, [isAuthenticated, accessToken, selectedBankAccount]);

  const selectedAccount = bankAccounts.find((account) => account.url === selectedBankAccount);
  const isLoadingContent = isLoading || transactionsLoading;

  // Helper function to get transaction status icon and color for unexplained transactions
  function getTransactionStatusIcon(transaction: BankTransaction) {
    if (!transaction) return { source: Icon.QuestionMark, tintColor: "#FFCC00" }; // Yellow for unknown

    if (transaction.status === "unexplained") {
      return { source: Icon.ExclamationMark, tintColor: "#FF3B30" }; // Red for urgent attention
    } else if (transaction.status === "marked_for_review") {
      return { source: Icon.Warning, tintColor: "#FF9500" }; // Orange for review
    } else {
      return { source: Icon.CheckCircle, tintColor: "#10B981" }; // Green for explained
    }
  }

  return (
    <List
      isLoading={isLoadingContent}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Select Bank Account"
          placeholder="Choose a bank account"
          value={selectedBankAccount}
          onChange={setSelectedBankAccount}
        >
          {bankAccounts.map((account) => (
            <List.Dropdown.Item
              key={account.url}
              title={`${account.name} (${account.bank_name || account.type})`}
              value={account.url}
            />
          ))}
        </List.Dropdown>
      }
    >
      {!selectedBankAccount && bankAccounts.length > 0 ? (
        <List.EmptyView
          icon={Icon.BankNote}
          title="Select a Bank Account"
          description="Choose a bank account from the dropdown to view unexplained transactions"
        />
      ) : transactions.length === 0 && selectedBankAccount ? (
        <List.EmptyView
          icon={{ source: Icon.CheckCircle, tintColor: "#10B981" }}
          title="No Unexplained Transactions"
          description={
            selectedAccount
              ? `All transactions for ${selectedAccount.name} have been explained`
              : "All transactions have been explained"
          }
        />
      ) : (
        <>
          {selectedAccount && (
            <List.Section title={`Unexplained Transactions - ${selectedAccount.name} (${transactions.length})`}>
              {transactions.map((transaction) => {
                const statusIcon = getTransactionStatusIcon(transaction);
                const unexplainedAmount = transaction.unexplained_amount
                  ? parseFloat(transaction.unexplained_amount)
                  : 0;

                return (
                  <List.Item
                    key={transaction.url}
                    icon={statusIcon}
                    title={transaction.description}
                    accessories={[
                      { text: formatCurrencyAmount(companyInfo?.currency || "GBP", transaction.amount) },
                      { date: parseDate(transaction.dated_on) },
                      ...(unexplainedAmount > 0
                        ? [
                            {
                              text: `Unexplained: ${formatCurrencyAmount(companyInfo?.currency || "GBP", unexplainedAmount)}`,
                              icon: { source: Icon.Warning, tintColor: "#FF9500" },
                            },
                          ]
                        : []),
                      ...(transaction.is_manual ? [{ text: "Manual", icon: Icon.Pencil }] : []),
                    ]}
                    actions={
                      <ActionPanel>
                        {companyInfo && (
                          <Action.OpenInBrowser
                            title="View in Freeagent"
                            url={getBankTransactionUrl(transaction.url, selectedBankAccount, companyInfo)}
                            icon={Icon.Globe}
                          />
                        )}
                        <Action.CopyToClipboard title="Copy Transaction ID" content={transaction.transaction_id} />
                        <Action.CopyToClipboard
                          title="Copy Description"
                          content={transaction.description}
                          icon={Icon.Document}
                        />
                        <Action.CopyToClipboard title="Copy Amount" content={transaction.amount} icon={Icon.Coins} />
                        {transaction.unexplained_amount && (
                          <Action.CopyToClipboard
                            title="Copy Unexplained Amount"
                            content={transaction.unexplained_amount}
                            icon={Icon.Warning}
                          />
                        )}
                      </ActionPanel>
                    }
                  />
                );
              })}
            </List.Section>
          )}
        </>
      )}
    </List>
  );
};

export default authorizedWithFreeAgent(ListUnexplainedTransactions);
