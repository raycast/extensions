import { ActionPanel, Action, Icon, List } from "@raycast/api";
import { useEffect, useState } from "react";
import { authorizedWithFreeAgent } from "./oauth";
import { BankAccount, BankTransaction } from "./types";
import { fetchBankAccounts, fetchBankTransactions } from "./services/freeagent";
import { formatCurrencyAmount, parseDate, getBankTransactionUrl } from "./utils/formatting";
import { useFreeAgent } from "./hooks/useFreeAgent";

const ListBankTransactions = function Command() {
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
  }, [isAuthenticated, accessToken]);

  // Load transactions when bank account is selected
  useEffect(() => {
    async function loadTransactions() {
      if (!isAuthenticated || !accessToken || !selectedBankAccount) {
        setTransactions([]);
        return;
      }

      setTransactionsLoading(true);
      try {
        const transactionList = await fetchBankTransactions(accessToken, selectedBankAccount, "all");
        setTransactions(transactionList);
      } catch (error) {
        handleError(error, "Failed to fetch bank transactions");
        setTransactions([]);
      } finally {
        setTransactionsLoading(false);
      }
    }

    loadTransactions();
  }, [isAuthenticated, accessToken, selectedBankAccount]);

  const selectedAccount = bankAccounts.find((account) => account.url === selectedBankAccount);
  const isLoadingContent = isLoading || transactionsLoading;

  // Helper function to get transaction status icon and color
  function getTransactionStatusIcon(transaction: BankTransaction) {
    if (transaction.unexplained_amount && parseFloat(transaction.unexplained_amount) > 0) {
      return { source: Icon.ExclamationMark, tintColor: "#FF6B35" }; // Orange for unexplained
    }
    if (transaction.is_manual) {
      return { source: Icon.Pencil, tintColor: "#6366F1" }; // Blue for manual
    }
    return { source: Icon.Coins, tintColor: "#10B981" }; // Green for explained/normal
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
          description="Choose a bank account from the dropdown to view transactions"
        />
      ) : transactions.length === 0 && selectedBankAccount ? (
        <List.EmptyView
          icon={Icon.Coins}
          title="No Transactions"
          description={selectedAccount ? `No transactions found for ${selectedAccount.name}` : "No transactions found"}
        />
      ) : (
        <>
          {selectedAccount && (
            <List.Section title={`All Transactions - ${selectedAccount.name}`}>
              {transactions.map((transaction) => {
                const statusIcon = getTransactionStatusIcon(transaction);
                const isUnexplained = transaction.unexplained_amount && parseFloat(transaction.unexplained_amount) > 0;

                return (
                  <List.Item
                    key={transaction.url}
                    icon={statusIcon}
                    title={transaction.description}
                    subtitle={transaction.transaction_id}
                    accessories={[
                      { text: formatCurrencyAmount(companyInfo?.currency || "GBP", transaction.amount) },
                      { date: parseDate(transaction.dated_on) },
                      ...(isUnexplained ? [{ text: "Needs Attention", icon: Icon.ExclamationMark }] : []),
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

export default authorizedWithFreeAgent(ListBankTransactions);
