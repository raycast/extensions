import { ActionPanel, Action, List, Icon, Color, Form, useNavigation } from "@raycast/api";
import { useCachedPromise, usePromise } from "@raycast/utils";
import { useState, useMemo } from "react";
import { toshl } from "./utils/toshl";
import { TransactionForm } from "./components/TransactionForm";
import { Transaction } from "./utils/types";
import { format, subDays, subMonths, startOfMonth, endOfMonth } from "date-fns";
import { formatCurrency } from "./utils/helpers";

// Filter Form Component
function FilterForm({
  onApply,
  categories,
  tags,
  accounts,
}: {
  onApply: (filters: FilterState) => void;
  categories: { id: string; name: string; type: string }[];
  tags: { id: string; name: string; type: string }[];
  accounts: { id: string; name: string }[];
}) {
  const { pop } = useNavigation();
  const today = new Date();

  return (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Apply Filters"
            icon={Icon.Filter}
            onSubmit={(values) => {
              onApply({
                dateRange: values.dateRange,
                fromDate: values.fromDate,
                toDate: values.toDate,
                type: values.type,
                category: values.category,
                tags: values.tags,
                account: values.account,
                search: values.search,
              });
              pop();
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Dropdown id="dateRange" title="Date Range" defaultValue="last_30_days">
        <Form.Dropdown.Item value="today" title="Today" />
        <Form.Dropdown.Item value="yesterday" title="Yesterday" />
        <Form.Dropdown.Item value="last_7_days" title="Last 7 Days" />
        <Form.Dropdown.Item value="last_30_days" title="Last 30 Days" />
        <Form.Dropdown.Item value="this_month" title="This Month" />
        <Form.Dropdown.Item value="last_month" title="Last Month" />
        <Form.Dropdown.Item value="last_90_days" title="Last 90 Days" />
        <Form.Dropdown.Item value="custom" title="Custom Range" />
      </Form.Dropdown>

      <Form.DatePicker
        id="fromDate"
        title="From Date"
        type={Form.DatePicker.Type.Date}
        defaultValue={subDays(today, 30)}
      />
      <Form.DatePicker id="toDate" title="To Date" type={Form.DatePicker.Type.Date} defaultValue={today} />

      <Form.Separator />

      <Form.Dropdown id="type" title="Type" defaultValue="all">
        <Form.Dropdown.Item value="all" title="All" />
        <Form.Dropdown.Item value="expense" title="Expenses" />
        <Form.Dropdown.Item value="income" title="Income" />
        <Form.Dropdown.Item value="transfer" title="Transfers" />
      </Form.Dropdown>

      <Form.Dropdown id="category" title="Category" defaultValue="">
        <Form.Dropdown.Item value="" title="All Categories" />
        {categories.map((c) => (
          <Form.Dropdown.Item key={c.id} value={c.id} title={`${c.name} (${c.type})`} />
        ))}
      </Form.Dropdown>

      <Form.TagPicker id="tags" title="Tags" defaultValue={[]}>
        {tags.map((t) => (
          <Form.TagPicker.Item key={t.id} value={t.id} title={t.name} />
        ))}
      </Form.TagPicker>

      <Form.Dropdown id="account" title="Account" defaultValue="">
        <Form.Dropdown.Item value="" title="All Accounts" />
        {accounts.map((a) => (
          <Form.Dropdown.Item key={a.id} value={a.id} title={a.name} />
        ))}
      </Form.Dropdown>

      <Form.TextField id="search" title="Search" placeholder="Search in description..." />
    </Form>
  );
}

interface FilterState {
  dateRange: string;
  fromDate: Date | null;
  toDate: Date | null;
  type: string;
  category: string;
  tags: string[];
  account: string;
  search: string;
}

function getDateRangeFromPreset(preset: string, customFrom?: Date | null, customTo?: Date | null) {
  const today = new Date();
  const formatDate = (d: Date) => format(d, "yyyy-MM-dd");

  switch (preset) {
    case "today":
      return { from: formatDate(today), to: formatDate(today) };
    case "yesterday": {
      const yesterday = subDays(today, 1);
      return { from: formatDate(yesterday), to: formatDate(yesterday) };
    }
    case "last_7_days":
      return { from: formatDate(subDays(today, 7)), to: formatDate(today) };
    case "last_30_days":
      return { from: formatDate(subDays(today, 30)), to: formatDate(today) };
    case "this_month":
      return { from: formatDate(startOfMonth(today)), to: formatDate(endOfMonth(today)) };
    case "last_month": {
      const lastMonth = subMonths(today, 1);
      return { from: formatDate(startOfMonth(lastMonth)), to: formatDate(endOfMonth(lastMonth)) };
    }
    case "last_90_days":
      return { from: formatDate(subDays(today, 90)), to: formatDate(today) };
    case "custom":
      return {
        from: customFrom ? formatDate(customFrom) : formatDate(subDays(today, 30)),
        to: customTo ? formatDate(customTo) : formatDate(today),
      };
    default:
      return { from: formatDate(subDays(today, 30)), to: formatDate(today) };
  }
}

function getDateRangeLabel(preset: string, from: string, to: string): string {
  switch (preset) {
    case "today":
      return "Today";
    case "yesterday":
      return "Yesterday";
    case "last_7_days":
      return "Last 7 Days";
    case "last_30_days":
      return "Last 30 Days";
    case "this_month":
      return "This Month";
    case "last_month":
      return "Last Month";
    case "last_90_days":
      return "Last 90 Days";
    case "custom":
      return `${from} → ${to}`;
    default:
      return "Last 30 Days";
  }
}

export default function SearchEntries() {
  const { push, pop } = useNavigation();
  const today = new Date();

  // Filters state
  const [filters, setFilters] = useState<FilterState>({
    dateRange: "last_30_days",
    fromDate: subDays(today, 30),
    toDate: today,
    type: "all",
    category: "",
    tags: [],
    account: "",
    search: "",
  });

  // Compute date range
  const { from, to } = getDateRangeFromPreset(filters.dateRange, filters.fromDate, filters.toDate);

  // Fetch data
  const { data: categories } = useCachedPromise(() => toshl.getCategories());
  const { data: tags } = useCachedPromise(() => toshl.getTags());
  const { data: accounts } = useCachedPromise(() => toshl.getAccounts());
  const { data: defaultCurrency } = useCachedPromise(() => toshl.getDefaultCurrency());

  const {
    data: transactions,
    isLoading,
    revalidate,
  } = usePromise(
    async (fromDate: string, toDate: string) => {
      return toshl.getTransactions({ from: fromDate, to: toDate, per_page: 200 });
    },
    [from, to],
  );

  // Helper to check if entry is a transfer
  const isTransfer = (t: Transaction) => !!t.transaction?.account;

  // Filter transactions based on current filters
  const filteredTransactions = useMemo(() => {
    if (!transactions) return [];

    return transactions.filter((t) => {
      // Type filter - check for transfers first
      const entryIsTransfer = isTransfer(t);
      if (filters.type === "transfer" && !entryIsTransfer) return false;
      if (filters.type === "expense" && (t.amount >= 0 || entryIsTransfer)) return false;
      if (filters.type === "income" && (t.amount < 0 || entryIsTransfer)) return false;

      // Category filter (transfers may not have category)
      if (filters.category && t.category !== filters.category) return false;

      // Tags filter (match any)
      if (filters.tags.length > 0) {
        const hasMatchingTag = filters.tags.some((tagId) => (t.tags || []).includes(tagId));
        if (!hasMatchingTag) return false;
      }

      // Account filter - for transfers, match either from or to account
      if (filters.account) {
        const matchesFrom = t.account === filters.account;
        const matchesTo = t.transaction?.account === filters.account;
        if (!matchesFrom && !matchesTo) return false;
      }

      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        if (!t.desc?.toLowerCase().includes(searchLower)) return false;
      }

      return true;
    });
  }, [transactions, filters]);

  // Calculate summary
  const summary = useMemo(() => {
    const transfers = filteredTransactions.filter((t) => isTransfer(t));
    const expenses = filteredTransactions.filter((t) => t.amount < 0 && !isTransfer(t));
    const incomes = filteredTransactions.filter((t) => t.amount >= 0 && !isTransfer(t));
    const totalExpenses = expenses.reduce((sum, t) => sum + Math.abs(t.amount), 0);
    const totalIncome = incomes.reduce((sum, t) => sum + t.amount, 0);
    const totalTransfers = transfers.reduce((sum, t) => sum + Math.abs(t.amount), 0);

    return {
      count: filteredTransactions.length,
      expenseCount: expenses.length,
      incomeCount: incomes.length,
      transferCount: transfers.length,
      totalExpenses,
      totalIncome,
      totalTransfers,
      net: totalIncome - totalExpenses,
    };
  }, [filteredTransactions]);

  // Helpers
  const getCategoryName = (id: string) => categories?.find((c) => c.id === id)?.name || "Unknown";
  const getTagNames = (ids: string[]) => ids.map((id) => tags?.find((t) => t.id === id)?.name || "").filter(Boolean);
  const getAccountName = (id: string) => accounts?.find((a) => a.id === id)?.name || "Unknown";

  // Active filter count for badge
  const activeFilterCount = [
    filters.type !== "all",
    filters.category !== "",
    filters.tags.length > 0,
    filters.account !== "",
    filters.search !== "",
  ].filter(Boolean).length;

  // Group transactions by date
  const transactionsByDate = useMemo(() => {
    return filteredTransactions.reduce(
      (acc, t) => {
        const date = t.date;
        if (!acc[date]) acc[date] = [];
        acc[date].push(t);
        return acc;
      },
      {} as Record<string, Transaction[]>,
    );
  }, [filteredTransactions]);

  const sortedDates = Object.keys(transactionsByDate).sort((a, b) => b.localeCompare(a));

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search entries..."
      onSearchTextChange={(text) => setFilters((f) => ({ ...f, search: text }))}
    >
      <List.Section title="Summary">
        <List.Item
          icon={Icon.BarChart}
          title={getDateRangeLabel(filters.dateRange, from, to)}
          accessories={[
            { text: `${summary.count} entries` },
            {
              text: `Expenses: ${formatCurrency(summary.totalExpenses, defaultCurrency || "USD")}`,
              icon: Icon.ArrowDown,
            },
            {
              text: `Income: ${formatCurrency(summary.totalIncome, defaultCurrency || "USD")}`,
              icon: Icon.ArrowUp,
            },
            {
              text: `Net: ${summary.net >= 0 ? "+" : ""}${formatCurrency(summary.net, defaultCurrency || "USD")}`,
              icon: summary.net >= 0 ? Icon.CheckCircle : Icon.ExclamationMark,
            },
          ]}
        />
      </List.Section>
      {sortedDates.map((date) => (
        <List.Section key={date} title={format(new Date(date), "EEEE, MMM d, yyyy")}>
          {transactionsByDate[date].map((transaction) => {
            const entryIsTransfer = isTransfer(transaction);
            const toAccountId = transaction.transaction?.account;

            // Determine icon and subtitle based on type
            let icon;
            let subtitle;
            if (entryIsTransfer) {
              icon = { source: Icon.Switch, tintColor: Color.Blue };
              subtitle = `${getAccountName(transaction.account)} → ${toAccountId ? getAccountName(toAccountId) : "Unknown"}`;
            } else if (transaction.amount < 0) {
              icon = { source: Icon.ArrowDown, tintColor: Color.Red };
              subtitle = getCategoryName(transaction.category);
            } else {
              icon = { source: Icon.ArrowUp, tintColor: Color.Green };
              subtitle = getCategoryName(transaction.category);
            }

            return (
              <List.Item
                key={transaction.id}
                icon={icon}
                title={transaction.desc || (entryIsTransfer ? "Transfer" : "No Description")}
                subtitle={subtitle}
                accessories={[
                  ...(!entryIsTransfer && getTagNames(transaction.tags || []).length > 0
                    ? [{ text: getTagNames(transaction.tags || []).join(", "), icon: Icon.Tag }]
                    : []),
                  ...(transaction.repeat ? [{ icon: Icon.ArrowClockwise, tooltip: "Recurring" }] : []),
                  {
                    text: formatCurrency(transaction.amount, transaction.currency.code),
                  },
                ]}
                actions={
                  <ActionPanel>
                    <ActionPanel.Section title="Filters">
                      <Action
                        title={`Filters${activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}`}
                        icon={Icon.Filter}
                        shortcut={{ modifiers: ["cmd"], key: "f" }}
                        onAction={() =>
                          push(
                            <FilterForm
                              categories={categories || []}
                              tags={tags || []}
                              accounts={accounts || []}
                              onApply={setFilters}
                            />,
                          )
                        }
                      />
                      <Action
                        title="Reset Filters"
                        icon={Icon.XMarkCircle}
                        shortcut={{ modifiers: ["cmd", "shift"], key: "r" }}
                        onAction={() =>
                          setFilters({
                            dateRange: "last_30_days",
                            fromDate: subDays(today, 30),
                            toDate: today,
                            type: "all",
                            category: "",
                            tags: [],
                            account: "",
                            search: "",
                          })
                        }
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section title="Edit">
                      <Action
                        title="Edit Entry"
                        icon={Icon.Pencil}
                        onAction={() =>
                          push(
                            <TransactionForm
                              type={transaction.amount < 0 ? "expense" : "income"}
                              transaction={transaction}
                              onSubmit={async (values) => {
                                await toshl.updateTransaction(
                                  transaction.id,
                                  values,
                                  transaction.repeat ? "one" : undefined,
                                );
                                revalidate();
                                pop();
                              }}
                            />,
                          )
                        }
                      />
                    </ActionPanel.Section>
                    <ActionPanel.Section>
                      <Action.OpenInBrowser title="Open in Toshl" url="https://toshl.com/app/#/expenses" />
                    </ActionPanel.Section>
                  </ActionPanel>
                }
              />
            );
          })}
        </List.Section>
      ))}
    </List>
  );
}
