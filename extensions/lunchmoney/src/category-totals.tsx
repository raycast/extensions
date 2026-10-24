import { ActionPanel, Action, Icon, List, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { type Transaction, type Category, type Tag, useLunchMoney, usePrimaryCurrency } from "./api";
import { getTransactionBaseValue, formatCurrency, buildLunchMoneyUrl, formatTransactionsAsText } from "./format";
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
  // Group all transactions by category, accumulating signed amounts so refunds
  // (negative amounts in an expense category) subtract from the total.
  transactions.forEach((transaction) => {
    // Look up category to get name and is_income
    const category = categories.find((c) => c.id === transaction.category_id);
    // Honor LunchMoney's "exclude from totals" flag (e.g. transfers, reimbursements) so
    // these don't inflate spending/income figures — matching the web app's behavior.
    if (category?.exclude_from_totals) return;
    const isIncome = category?.is_income ?? false;

    const amount = getTransactionBaseValue(transaction);
    const categoryName = category?.name || "Uncategorized";

    const existing = categoryMap.get(categoryName) || {
      total: 0,
      count: 0,
      transactions: [],
      isIncome: isIncome,
    };
    categoryMap.set(categoryName, {
      total: existing.total + amount,
      count: existing.count + 1,
      transactions: [...existing.transactions, transaction],
      isIncome: isIncome,
    });
  });

  // Percentages are relative to each category's own section, so income and expense
  // categories each sum to 100% within their section (not against each other).
  let incomeGrandTotal = 0;
  let expenseGrandTotal = 0;
  categoryMap.forEach((data) => {
    if (data.isIncome) {
      incomeGrandTotal += Math.abs(data.total);
    } else {
      expenseGrandTotal += Math.abs(data.total);
    }
  });

  const totals: CategoryTotal[] = Array.from(categoryMap.entries())
    .map(([name, data]) => {
      const sectionTotal = data.isIncome ? incomeGrandTotal : expenseGrandTotal;
      return {
        name,
        total: Math.abs(data.total),
        count: data.count,
        percentage: sectionTotal > 0 ? (Math.abs(data.total) / sectionTotal) * 100 : 0,
        transactions: data.transactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
        isIncome: data.isIncome,
      };
    })
    .sort((a, b) => b.total - a.total);

  return totals;
}

function CategoryTransactionsList({
  category,
  categories,
  tags,
  onRevalidate,
}: {
  category: CategoryTotal;
  categories: Category[];
  tags: Tag[];
  onRevalidate?: () => void;
}) {
  const primaryCurrency = usePrimaryCurrency();
  const formattedTotal = formatCurrency(category.total, primaryCurrency);

  const allTransactionsText = useMemo(
    () => formatTransactionsAsText(category.transactions, categories),
    [category.transactions, categories],
  );

  return (
    <List navigationTitle={`${category.name} - ${formattedTotal}`} searchBarPlaceholder="Search transactions...">
      {category.transactions.map((transaction) => {
        const lunchMoneyUrl = buildLunchMoneyUrl(transaction);
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

  const transactions = data ?? [];
  const categories = categoriesData ?? [];
  const tags = tagsData ?? [];
  const categoryTotals = calculateCategoryTotals(transactions, categories);

  // Separate income and expenses
  const incomeTotals = categoryTotals.filter((cat) => cat.isIncome);
  const expenseTotals = categoryTotals.filter((cat) => !cat.isIncome);

  const totalIncome = incomeTotals.reduce((sum, cat) => sum + cat.total, 0);
  const totalExpenses = expenseTotals.reduce((sum, cat) => sum + cat.total, 0);

  const primaryCurrency = usePrimaryCurrency();
  const formattedTotalIncome = formatCurrency(totalIncome, primaryCurrency);
  const formattedTotalExpenses = formatCurrency(totalExpenses, primaryCurrency);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search categories..."
      searchBarAccessory={<DateRangeDropdown value={selectedMonth} onChange={setSelectedMonth} />}
    >
      {incomeTotals.length > 0 && (
        <List.Section title={`Income: ${formattedTotalIncome}`}>
          {incomeTotals.map((category) => {
            const formattedTotal = formatCurrency(category.total, primaryCurrency);

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
            const formattedTotal = formatCurrency(category.total, primaryCurrency);

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
