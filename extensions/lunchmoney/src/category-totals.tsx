import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { type Transaction, type Category, type Tag, useLunchMoney } from "./api";
import { getAmountValue, formatCurrency, buildLunchMoneyUrl, formatTransactionsAsText } from "./format";
import { TransactionListItem, getDateRangeForFilter, DateRangeDropdown } from "./components";

interface CategoryTotal {
  name: string;
  total: number;
  count: number;
  percentage: number;
  transactions: Transaction[];
  isIncome: boolean;
}

function calculateCategoryTotals(transactions: Transaction[], categories: Category[]): CategoryTotal[] {
  const categoryMap = new Map<
    string,
    {
      total: number;
      count: number;
      transactions: Transaction[];
      isIncome: boolean;
    }
  >();
  let grandTotal = 0;

  // Group all transactions by category
  transactions.forEach((transaction) => {
    // Look up category to get name and is_income
    const category = categories.find((c) => c.id === transaction.category_id);
    const isIncome = category?.is_income ?? false;

    const amount = getAmountValue(transaction.amount, isIncome);
    const categoryName = category?.name || "Uncategorized";

    // Only count non-income towards grand total
    if (!isIncome) {
      grandTotal += Math.abs(amount);
    }

    const existing = categoryMap.get(categoryName) || {
      total: 0,
      count: 0,
      transactions: [],
      isIncome: isIncome,
    };
    categoryMap.set(categoryName, {
      total: existing.total + Math.abs(amount),
      count: existing.count + 1,
      transactions: [...existing.transactions, transaction],
      isIncome: isIncome,
    });
  });

  const totals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      total: data.total,
      count: data.count,
      percentage: grandTotal > 0 ? (data.total / grandTotal) * 100 : 0,
      transactions: data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
      isIncome: data.isIncome,
    }))
    .sort((a, b) => b.total - a.total);

  return totals;
}

function CategoryTransactionsList({
  category,
  categories,
  tags,
  onRevalidate,
  start,
  end,
}: {
  category: CategoryTotal;
  categories: Category[];
  tags: Tag[];
  onRevalidate?: () => void;
  start: string;
  end: string;
}) {
  const formattedTotal = formatCurrency(category.total, "USD");

  const allTransactionsText = useMemo(
    () => formatTransactionsAsText(category.transactions, categories),
    [category.transactions, categories],
  );

  return (
    <List navigationTitle={`${category.name} - ${formattedTotal}`} searchBarPlaceholder="Search transactions...">
      {category.transactions.map((transaction) => {
        const lunchMoneyUrl = buildLunchMoneyUrl({ transaction, start, end });
        return (
          <TransactionListItem
            key={transaction.id}
            transaction={transaction}
            categories={categories}
            tags={tags}
            onRevalidate={onRevalidate}
            lunchMoneyUrl={lunchMoneyUrl}
            copyAllText={allTransactionsText}
          />
        );
      })}
    </List>
  );
}

export default function Command() {
  const client = useLunchMoney();
  const [selectedMonth, setSelectedMonth] = useState<string>("thisMonth");
  const { start, end } = useMemo(() => getDateRangeForFilter(selectedMonth), [selectedMonth]);

  const { isLoading, data, revalidate } = useCachedPromise(
    async (startDate: string, endDate: string) => {
      const allTransactions: Transaction[] = [];
      let offset = 0;
      let hasMore = true;

      while (hasMore) {
        const { data, error } = await client.GET("/transactions", {
          params: { query: { start_date: startDate, end_date: endDate, offset } },
        });
        if (error) {
          console.error("Transactions fetch error:", error);
          throw new Error(JSON.stringify(error));
        }
        allTransactions.push(...(data?.transactions || []));
        hasMore = data?.has_more ?? false;
        offset += data?.transactions?.length ?? 0;
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

  const transactions = data ?? [];
  const categories = categoriesData ?? [];
  const tags = tagsData ?? [];
  const categoryTotals = calculateCategoryTotals(transactions, categories);

  // Separate income and expenses
  const incomeTotals = categoryTotals.filter((cat) => cat.isIncome);
  const expenseTotals = categoryTotals.filter((cat) => !cat.isIncome);

  const totalIncome = incomeTotals.reduce((sum, cat) => sum + cat.total, 0);
  const totalExpenses = expenseTotals.reduce((sum, cat) => sum + cat.total, 0);

  const formattedTotalIncome = formatCurrency(totalIncome, "USD");
  const formattedTotalExpenses = formatCurrency(totalExpenses, "USD");

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search categories..."
      searchBarAccessory={<DateRangeDropdown value={selectedMonth} onChange={setSelectedMonth} />}
    >
      {incomeTotals.length > 0 && (
        <List.Section title={`Income: ${formattedTotalIncome}`}>
          {incomeTotals.map((category) => {
            const formattedTotal = formatCurrency(category.total, "USD");

            return (
              <List.Item
                key={category.name}
                icon={{ source: Icon.Tag, tintColor: Color.Green }}
                title={category.name}
                subtitle={`${category.count} transaction${category.count !== 1 ? "s" : ""}`}
                accessories={[
                  {
                    text: `${category.percentage.toFixed(1)}%`,
                  },
                  {
                    text: formattedTotal,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Transactions"
                      icon={Icon.List}
                      target={
                        <CategoryTransactionsList
                          category={category}
                          categories={categories}
                          tags={tags}
                          onRevalidate={revalidate}
                          start={start}
                          end={end}
                        />
                      }
                    />
                    <Action.CopyToClipboard
                      content={`${category.name}: ${formattedTotal} (${category.percentage.toFixed(1)}%)`}
                      title="Copy Category Total"
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}

      {expenseTotals.length > 0 && (
        <List.Section title={`Expenses: ${formattedTotalExpenses}`}>
          {expenseTotals.map((category) => {
            const formattedTotal = formatCurrency(category.total, "USD");

            return (
              <List.Item
                key={category.name}
                icon={{ source: Icon.Tag, tintColor: Color.Red }}
                title={category.name}
                subtitle={`${category.count} transaction${category.count !== 1 ? "s" : ""}`}
                accessories={[
                  {
                    text: `${category.percentage.toFixed(1)}%`,
                  },
                  {
                    text: formattedTotal,
                  },
                ]}
                actions={
                  <ActionPanel>
                    <Action.Push
                      title="View Transactions"
                      icon={Icon.List}
                      target={
                        <CategoryTransactionsList
                          category={category}
                          categories={categories}
                          tags={tags}
                          onRevalidate={revalidate}
                          start={start}
                          end={end}
                        />
                      }
                    />
                    <Action.CopyToClipboard
                      content={`${category.name}: ${formattedTotal} (${category.percentage.toFixed(1)}%)`}
                      title="Copy Category Total"
                    />
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      )}
    </List>
  );
}
