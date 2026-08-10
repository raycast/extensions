import { List } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { type Transaction, type Category, type Tag, useLunchMoney, usePrimaryCurrency } from "./api";
import { TransactionListItem, getDateRangeForFilter, DateRangeDropdown } from "./components";
import { formatCurrency, buildLunchMoneyUrl, formatTransactionsAsText, getTransactionBaseValue } from "./format";

function filterTransactions(
  transactions: Transaction[],
  searchText: string,
  categories: Category[],
  tags: Tag[],
): Transaction[] {
  if (!searchText) return transactions;

  const lowerSearch = searchText.toLowerCase();
  return transactions.filter((t) => {
    const category = categories.find((c) => c.id === t.category_id);
    const isIncome = category?.is_income ?? false;
    const transactionTags = (t.tag_ids || [])
      .map((tagId) => tags.find((tag) => tag.id === tagId))
      .filter((tag): tag is Tag => tag !== undefined);

    return (
      t.payee?.toLowerCase().includes(lowerSearch) ||
      t.notes?.toLowerCase().includes(lowerSearch) ||
      t.status?.toLowerCase().includes(lowerSearch) ||
      category?.name?.toLowerCase().includes(lowerSearch) ||
      (isIncome ? "income" : "expense").includes(lowerSearch) ||
      transactionTags.some((tag) => tag.name.toLowerCase().includes(lowerSearch))
    );
  });
}

export default function Command() {
  const client = useLunchMoney();
  const [selectedMonth, setSelectedMonth] = useState<string>("thisMonth");
  const [searchText, setSearchText] = useState<string>("");
  const { start, end } = useMemo(() => getDateRangeForFilter(selectedMonth), [selectedMonth]);

  const { isLoading, data, revalidate } = useCachedPromise(
    async (startDate: string, endDate: string) => {
      const allTransactions: Transaction[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await client.GET("/transactions", {
          params: { query: { start_date: startDate, end_date: endDate, offset, include_pending: true } },
        });
        if (error) {
          console.error("Transactions fetch error:", error);
          throw new Error(JSON.stringify(error));
        }
        const batch = data?.transactions || [];
        allTransactions.push(...batch);
        // Stop on an empty page even if the API still reports has_more, so offset always
        // advances and the loop can't spin forever.
        hasMore = (data?.has_more ?? false) && batch.length > 0;
        offset += batch.length;
      }

      return allTransactions;
    },
    [start, end],
  );

  const { data: categoriesData } = useCachedPromise(async () => {
    const { data, error } = await client.GET("/categories");
    if (error) {
      console.error("Categories fetch error:", error);
      throw new Error(JSON.stringify(error));
    }
    return data?.categories || [];
  });

  const { data: tagsData } = useCachedPromise(async () => {
    const { data, error } = await client.GET("/tags");
    if (error) {
      console.error("Tags fetch error:", error);
      throw new Error(JSON.stringify(error));
    }
    return data?.tags || [];
  });

  const transactions = (data ?? []).sort((a: Transaction, b: Transaction) => {
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const categories = categoriesData ?? [];
  const tags = tagsData ?? [];
  const primaryCurrency = usePrimaryCurrency();

  // Filter transactions based on search text
  const filteredTransactions = useMemo(
    () => filterTransactions(transactions, searchText, categories, tags),
    [transactions, searchText, categories, tags],
  );

  const pendingTransactions = filteredTransactions.filter((t: Transaction) => t.is_pending);
  const nonPendingTransactions = filteredTransactions.filter((t: Transaction) => !t.is_pending);

  const allTransactionsText = useMemo(
    () => formatTransactionsAsText(filteredTransactions, categories),
    [filteredTransactions, categories],
  );

  // Net total in the user's primary currency. getTransactionBaseValue is positive for debits
  // (money out), so we negate: a positive total means net income, negative means net spent.
  const totalAmount = useMemo(
    () => filteredTransactions.reduce((sum, t) => sum - getTransactionBaseValue(t), 0),
    [filteredTransactions],
  );

  const pendingTotal = useMemo(
    () => pendingTransactions.reduce((sum, t) => sum - getTransactionBaseValue(t), 0),
    [pendingTransactions],
  );

  const nonPendingTotal = useMemo(
    () => nonPendingTransactions.reduce((sum, t) => sum - getTransactionBaseValue(t), 0),
    [nonPendingTransactions],
  );

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search transactions..."
      searchBarAccessory={<DateRangeDropdown value={selectedMonth} onChange={setSelectedMonth} />}
      filtering={false}
      onSearchTextChange={setSearchText}
    >
      <List.Section
        title="Summary"
        subtitle={`${filteredTransactions.length} transaction${filteredTransactions.length === 1 ? "" : "s"} • Total: ${formatCurrency(Math.abs(totalAmount), primaryCurrency)}${totalAmount > 0 ? " income" : " spent"}`}
      />
      {pendingTransactions.length > 0 && (
        <List.Section
          title="Pending"
          subtitle={`${pendingTransactions.length} transaction${pendingTransactions.length === 1 ? "" : "s"} • ${formatCurrency(Math.abs(pendingTotal), primaryCurrency)}${pendingTotal > 0 ? " income" : " spent"}`}
        >
          {pendingTransactions.map((transaction: Transaction) => {
            const lunchMoneyUrl = buildLunchMoneyUrl(transaction);

            return (
              <TransactionListItem
                key={transaction.id}
                transaction={transaction}
                categories={categories}
                tags={tags}
                onRevalidate={revalidate}
                lunchMoneyUrl={lunchMoneyUrl}
                copyAllText={allTransactionsText}
              />
            );
          })}
        </List.Section>
      )}
      <List.Section
        title="Transactions"
        subtitle={`${nonPendingTransactions.length} transaction${nonPendingTransactions.length === 1 ? "" : "s"} • ${formatCurrency(Math.abs(nonPendingTotal), primaryCurrency)}${nonPendingTotal > 0 ? " income" : " spent"}`}
      >
        {nonPendingTransactions.map((transaction: Transaction) => {
          const lunchMoneyUrl = buildLunchMoneyUrl(transaction);

          return (
            <TransactionListItem
              key={transaction.id}
              transaction={transaction}
              categories={categories}
              tags={tags}
              onRevalidate={revalidate}
              lunchMoneyUrl={lunchMoneyUrl}
              copyAllText={allTransactionsText}
            />
          );
        })}
      </List.Section>
    </List>
  );
}
