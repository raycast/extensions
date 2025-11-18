import { Color, Icon, List, showToast, Toast } from "@raycast/api";
import { useEffect, useRef, useState } from "react";
import { getAllAccounts, getTransactions } from "./lib/api";
import { getAccessToken } from "./lib/auth";
import { CACHE_KEYS, getCached, setCached } from "./lib/cache";
import { CACHE_TTL } from "./lib/constants";
import { CredentialWithAccounts, Transaction } from "./lib/types";

function formatCurrency(amount: number, currency: string = "JPY"): string {
  return new Intl.NumberFormat("ja-JP", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateString;
  }
}

function getAccountName(accountId: number, credentials: CredentialWithAccounts[]): string {
  for (const credential of credentials) {
    const account = credential.accounts.find((acc) => acc.id === accountId);
    if (account) {
      return account.nickname || account.institution_account_name;
    }
  }
  return `Account #${accountId}`;
}

export default function Command() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<CredentialWithAccounts[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetchedRef = useRef(false);

  useEffect(() => {
    // Prevent duplicate requests in React StrictMode
    if (hasFetchedRef.current) {
      return;
    }
    hasFetchedRef.current = true;

    async function fetchTransactions() {
      try {
        setIsLoading(true);
        setError(null);

        // Get date range (last 30 days) - normalize to start of day for consistent cache keys
        const endDate = new Date();
        endDate.setHours(23, 59, 59, 999);
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        startDate.setHours(0, 0, 0, 0);

        // Check cache first - if we have valid cached data, use it immediately
        const cacheKey = CACHE_KEYS.transactions(startDate, endDate);
        console.debug(`[List Transactions] Checking cache for key: ${cacheKey}`);
        const cached = getCached<Transaction[]>(cacheKey);
        if (cached && cached.length > 0) {
          console.debug(`[List Transactions] Using cached data (${cached.length} transactions)`);
          setTransactions(cached);
          setIsLoading(false);
          // Fetch fresh data in the background (silently update cache)
          console.debug("[List Transactions] Background refresh started");
          try {
            await getAccessToken();
            // Fetch accounts for account name resolution (use cache if available)
            const cachedAccounts = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
            if (cachedAccounts && cachedAccounts.length > 0) {
              setAccounts(cachedAccounts);
            } else {
              const accountsData = await getAllAccounts();
              setAccounts(accountsData);
            }
            const response = await getTransactions(startDate, endDate);
            console.debug(
              `[List Transactions] Background refresh complete (${response.transactions.length} transactions)`,
            );
            setTransactions(response.transactions);
            setCached(cacheKey, response.transactions, CACHE_TTL.TRANSACTIONS);
          } catch (error) {
            console.debug(`[List Transactions] Background refresh failed: ${error}`);
            // Silently fail background refresh - we have cached data to show
          }
          return;
        }

        // No cache or cache expired - fetch fresh data
        console.debug("[List Transactions] Cache miss - fetching fresh data");
        await getAccessToken();
        // Fetch accounts for account name resolution (use cache if available)
        const cachedAccounts = getCached<CredentialWithAccounts[]>(CACHE_KEYS.dataSnapshot());
        if (cachedAccounts && cachedAccounts.length > 0) {
          console.debug(`[List Transactions] Using cached accounts data`);
          setAccounts(cachedAccounts);
        } else {
          const accountsData = await getAllAccounts();
          setAccounts(accountsData);
        }
        const response = await getTransactions(startDate, endDate);
        setTransactions(response.transactions);
        setCached(cacheKey, response.transactions, CACHE_TTL.TRANSACTIONS);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Failed to fetch transactions";
        setError(errorMessage);
        await showToast({
          style: Toast.Style.Failure,
          title: "Error",
          message: errorMessage,
        });
      } finally {
        setIsLoading(false);
      }
    }

    fetchTransactions();
  }, []);

  if (error && transactions.length === 0) {
    return (
      <List>
        <List.EmptyView icon={Icon.ExclamationMark} title="Error Loading Transactions" description={error} />
      </List>
    );
  }

  return (
    <List isLoading={isLoading}>
      {transactions.length === 0 && !isLoading ? (
        <List.EmptyView
          icon={Icon.Receipt}
          title="No Transactions"
          description="No transactions found for the last 30 days."
        />
      ) : (
        transactions.map((transaction) => {
          const isExpense = transaction.amount < 0;
          const accountName = getAccountName(transaction.account_id, accounts);

          return (
            <List.Item
              key={transaction.id}
              icon={{
                source: isExpense ? Icon.ArrowDown : Icon.ArrowUp,
                tintColor: isExpense ? Color.Red : Color.Green,
              }}
              title={transaction.description_pretty || transaction.description_raw}
              subtitle={`${formatDate(transaction.date)} • ${accountName}`}
              accessories={[
                {
                  text: `${isExpense ? "-" : "+"}${formatCurrency(transaction.amount)}`,
                },
              ]}
              detail={
                <List.Item.Detail
                  metadata={
                    <List.Item.Detail.Metadata>
                      <List.Item.Detail.Metadata.Label
                        title="Description"
                        text={transaction.description_pretty || transaction.description_raw}
                      />
                      <List.Item.Detail.Metadata.Label title="Raw Description" text={transaction.description_raw} />
                      <List.Item.Detail.Metadata.Label title="Date" text={formatDate(transaction.date)} />
                      <List.Item.Detail.Metadata.Label title="Account" text={accountName} />
                      <List.Item.Detail.Metadata.Separator />
                      <List.Item.Detail.Metadata.Label
                        title="Amount"
                        text={`${isExpense ? "-" : "+"}${formatCurrency(transaction.amount)}`}
                      />
                      <List.Item.Detail.Metadata.Label title="Category ID" text={transaction.category_id.toString()} />
                      <List.Item.Detail.Metadata.Label
                        title="Expense Type"
                        text={transaction.expense_type.toString()}
                      />
                      {transaction.description_guest && (
                        <List.Item.Detail.Metadata.Label
                          title="Guest Description"
                          text={transaction.description_guest}
                        />
                      )}
                    </List.Item.Detail.Metadata>
                  }
                />
              }
            />
          );
        })
      )}
    </List>
  );
}
