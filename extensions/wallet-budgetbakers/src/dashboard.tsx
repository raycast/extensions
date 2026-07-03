import {
  Action,
  ActionPanel,
  Color,
  Detail,
  Icon,
  Keyboard,
  List,
} from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import RecordForm from "./components/RecordForm";
import { WalletRecord, getAccounts, getAllRecords } from "./lib/api";
import {
  formatDate,
  formatMoney,
  formatMoneyMap,
  isTransfer,
  parseMoneyDeep,
  recordSignedConvertedMoney,
  recordSignedMoney,
  startOfMonth,
  toDateParam,
} from "./lib/format";

const MONTHS_OF_HISTORY = 6;
const BAR_WIDTH = 14;

function bar(value: number, max: number, width = BAR_WIDTH): string {
  if (max <= 0) return "░".repeat(width);
  const filled = Math.max(
    0,
    Math.min(width, Math.round((value / max) * width)),
  );
  return "█".repeat(filled) + "░".repeat(width - filled);
}

function buildChartsMarkdown(params: {
  monthName: string;
  mainCurrency: string;
  monthly: { label: string; expenses: number; income: number }[];
  topCategories: { name: string; total: number }[];
  currentExpenses: number;
  currentIncome: number;
}): string {
  const { monthName, mainCurrency, monthly, topCategories } = params;
  const money = (value: number) =>
    formatMoney({ value, currency: mainCurrency });
  const maxMonthly = Math.max(
    1,
    ...monthly.map((month) => Math.max(month.expenses, month.income)),
  );
  const maxCategory = Math.max(1, ...topCategories.map((c) => c.total));

  const row = (label: string, value: number, max: number) =>
    `${label.padEnd(8)}│${bar(value, max, 28)}│ ${money(value)}`;

  const lines: string[] = [
    `# 📊 Wallet — ${monthName}`,
    "",
    `**Expenses:** ${money(params.currentExpenses)} · **Income:** ${money(params.currentIncome)} · **Balance:** ${money(params.currentIncome - params.currentExpenses)}`,
    "",
    `## Expenses by Month (${mainCurrency})`,
    "```",
    ...monthly.map((month) => row(month.label, month.expenses, maxMonthly)),
    "```",
    `## Income by Month (${mainCurrency})`,
    "```",
    ...monthly.map((month) => row(month.label, month.income, maxMonthly)),
    "```",
    "## Top Spending Categories (current month)",
    "```",
    ...topCategories.map((category) =>
      row(
        category.name.length > 8
          ? `${category.name.slice(0, 7)}…`
          : category.name,
        category.total,
        maxCategory,
      ),
    ),
    "```",
  ];
  return lines.join("\n");
}

interface MonthTotals {
  expenses: Map<string, number>;
  income: Map<string, number>;
  expenseTotalByMainCurrency: number;
  mainCurrency: string;
}

function summarize(records: WalletRecord[]): MonthTotals {
  const expenses = new Map<string, number>();
  const income = new Map<string, number>();
  const currencyCount = new Map<string, number>();

  for (const record of records) {
    if (isTransfer(record)) continue;
    const money = recordSignedConvertedMoney(record);
    if (!money) continue;
    currencyCount.set(
      money.currency,
      (currencyCount.get(money.currency) ?? 0) + 1,
    );
    const bucket = money.value < 0 ? expenses : income;
    bucket.set(
      money.currency,
      (bucket.get(money.currency) ?? 0) + Math.abs(money.value),
    );
  }

  const mainCurrency =
    [...currencyCount.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? "";
  return {
    expenses,
    income,
    expenseTotalByMainCurrency: expenses.get(mainCurrency) ?? 0,
    mainCurrency,
  };
}

function topExpenseCategories(records: WalletRecord[], mainCurrency: string) {
  const byCategory = new Map<
    string,
    {
      name: string;
      color?: string;
      total: number;
      byCurrency: Map<string, number>;
    }
  >();
  for (const record of records) {
    if (isTransfer(record)) continue;
    const money = recordSignedConvertedMoney(record);
    if (!money || money.value >= 0) continue;
    const name = record.category?.name ?? "Uncategorized";
    const entry = byCategory.get(name) ?? {
      name,
      color: record.category?.color,
      total: 0,
      byCurrency: new Map<string, number>(),
    };
    entry.byCurrency.set(
      money.currency,
      (entry.byCurrency.get(money.currency) ?? 0) + Math.abs(money.value),
    );
    if (money.currency === mainCurrency || !mainCurrency)
      entry.total += Math.abs(money.value);
    byCategory.set(name, entry);
  }
  return [...byCategory.values()].sort((a, b) => b.total - a.total);
}

export default function Dashboard() {
  const now = new Date();
  const currentMonthStart = startOfMonth(now);
  const historyStart = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - (MONTHS_OF_HISTORY - 1), 1),
  );
  const previousMonthStart = startOfMonth(
    new Date(now.getFullYear(), now.getMonth() - 1, 1),
  );

  const { data, isLoading, revalidate } = useCachedPromise(async () => {
    const [records, accounts] = await Promise.all([
      getAllRecords({ recordDate: [`gte.${toDateParam(historyStart)}`] }, 4000),
      getAccounts(),
    ]);
    return { records, accounts };
  });

  const records = data?.records ?? [];
  const inMonth = (record: WalletRecord, monthStart: Date) => {
    if (!record.recordDate) return false;
    const date = new Date(record.recordDate);
    return (
      date >= monthStart &&
      date < new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 1)
    );
  };

  const currentMonthRecords = records.filter((record) =>
    inMonth(record, currentMonthStart),
  );
  const previousMonthRecords = records.filter((record) =>
    inMonth(record, previousMonthStart),
  );

  const current = summarize(currentMonthRecords);
  const previous = summarize(previousMonthRecords);

  const balanceByCurrency = new Map<string, number>();
  for (const [currency, value] of current.income)
    balanceByCurrency.set(currency, value);
  for (const [currency, value] of current.expenses) {
    balanceByCurrency.set(
      currency,
      (balanceByCurrency.get(currency) ?? 0) - value,
    );
  }

  const previousExpense = previous.expenses.get(current.mainCurrency) ?? 0;
  const trendPercent =
    previousExpense > 0
      ? ((current.expenseTotalByMainCurrency - previousExpense) /
          previousExpense) *
        100
      : null;

  const topCategories = topExpenseCategories(
    currentMonthRecords,
    current.mainCurrency,
  ).slice(0, 8);
  const maxCategoryTotal = topCategories[0]?.total ?? 0;

  // Monthly history for the chart (oldest first)
  const monthly = Array.from({ length: MONTHS_OF_HISTORY }, (_, index) => {
    const monthStart = startOfMonth(
      new Date(
        now.getFullYear(),
        now.getMonth() - (MONTHS_OF_HISTORY - 1 - index),
        1,
      ),
    );
    const totals = summarize(
      records.filter((record) => inMonth(record, monthStart)),
    );
    return {
      label: monthStart.toLocaleDateString(undefined, {
        month: "short",
        year: "2-digit",
      }),
      expenses: totals.expenses.get(current.mainCurrency) ?? 0,
      income: totals.income.get(current.mainCurrency) ?? 0,
    };
  });
  const maxMonthly = Math.max(
    1,
    ...monthly.map((month) => Math.max(month.expenses, month.income)),
  );

  const latest = [...currentMonthRecords]
    .sort((a, b) => (b.recordDate ?? "").localeCompare(a.recordDate ?? ""))
    .slice(0, 8);

  const monthName = now.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
  const activeAccounts = (data?.accounts ?? []).filter(
    (account) => account.archived !== true,
  );

  const chartsMarkdown = buildChartsMarkdown({
    monthName,
    mainCurrency: current.mainCurrency,
    monthly,
    topCategories,
    currentExpenses: current.expenseTotalByMainCurrency,
    currentIncome: current.income.get(current.mainCurrency) ?? 0,
  });

  return (
    <List
      isLoading={isLoading}
      navigationTitle="Wallet Dashboard"
      searchBarPlaceholder="Monthly dashboard"
    >
      <List.Section title={`Summary — ${monthName}`}>
        <List.Item
          icon={{ source: Icon.ArrowDownCircle, tintColor: Color.Red }}
          title="Expenses"
          accessories={[
            {
              text: {
                value: formatMoneyMap(current.expenses),
                color: Color.Red,
              },
            },
          ]}
          actions={
            <DashboardActions
              revalidate={revalidate}
              chartsMarkdown={chartsMarkdown}
            />
          }
        />
        <List.Item
          icon={{ source: Icon.ArrowUpCircle, tintColor: Color.Green }}
          title="Income"
          accessories={[
            {
              text: {
                value: formatMoneyMap(current.income),
                color: Color.Green,
              },
            },
          ]}
          actions={
            <DashboardActions
              revalidate={revalidate}
              chartsMarkdown={chartsMarkdown}
            />
          }
        />
        <List.Item
          icon={{ source: Icon.BankNote, tintColor: Color.Blue }}
          title="Monthly Balance"
          accessories={[
            {
              text: {
                value: formatMoneyMap(balanceByCurrency),
                color: [...balanceByCurrency.values()].some(
                  (value) => value < 0,
                )
                  ? Color.Red
                  : Color.Green,
              },
            },
          ]}
          actions={
            <DashboardActions
              revalidate={revalidate}
              chartsMarkdown={chartsMarkdown}
            />
          }
        />
        <List.Item
          icon={{
            source:
              trendPercent !== null && trendPercent > 0
                ? Icon.ArrowUp
                : Icon.ArrowDown,
            tintColor:
              trendPercent !== null && trendPercent > 0
                ? Color.Red
                : Color.Green,
          }}
          title="Spending Trend vs. Previous Month"
          subtitle={
            trendPercent === null
              ? "No data for previous month"
              : `${trendPercent > 0 ? "+" : ""}${trendPercent.toFixed(1)} %`
          }
          accessories={[
            {
              text: `Previous month: ${formatMoney(
                previousExpense
                  ? { value: previousExpense, currency: current.mainCurrency }
                  : null,
              )}`,
            },
          ]}
          actions={
            <DashboardActions
              revalidate={revalidate}
              chartsMarkdown={chartsMarkdown}
            />
          }
        />
      </List.Section>

      <List.Section
        title={`History (last ${MONTHS_OF_HISTORY} months, ${current.mainCurrency || "main currency"})`}
      >
        {monthly.map((month) => (
          <List.Item
            key={month.label}
            icon={{ source: Icon.BarChart, tintColor: Color.Blue }}
            title={month.label}
            subtitle={`${bar(month.expenses, maxMonthly)}  expenses`}
            accessories={[
              {
                text: {
                  value: formatMoney({
                    value: month.expenses,
                    currency: current.mainCurrency,
                  }),
                  color: Color.Red,
                },
              },
              {
                text: {
                  value: formatMoney({
                    value: month.income,
                    currency: current.mainCurrency,
                  }),
                  color: Color.Green,
                },
              },
            ]}
            actions={
              <DashboardActions
                revalidate={revalidate}
                chartsMarkdown={chartsMarkdown}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section title="Top Spending Categories (this month)">
        {topCategories.map((category) => (
          <List.Item
            key={category.name}
            icon={{
              source: Icon.Circle,
              tintColor: category.color ?? Color.Orange,
            }}
            title={category.name}
            subtitle={bar(category.total, maxCategoryTotal)}
            accessories={[
              {
                text: {
                  value: formatMoneyMap(category.byCurrency),
                  color: Color.Red,
                },
              },
            ]}
            actions={
              <DashboardActions
                revalidate={revalidate}
                chartsMarkdown={chartsMarkdown}
              />
            }
          />
        ))}
      </List.Section>

      <List.Section title="Account Balances">
        {activeAccounts.map((account) => {
          const balance =
            parseMoneyDeep(account.balance, account.currencyCode ?? "") ??
            parseMoneyDeep(account.recordStats, account.currencyCode ?? "");
          return (
            <List.Item
              key={account.id}
              icon={{
                source: Icon.Wallet,
                tintColor: account.color ?? Color.SecondaryText,
              }}
              title={account.name ?? account.id}
              subtitle={account.accountType}
              accessories={[
                {
                  text: balance
                    ? {
                        value: formatMoney(balance),
                        color:
                          balance.value < 0 ? Color.Red : Color.PrimaryText,
                      }
                    : "—",
                },
              ]}
              actions={
                <DashboardActions
                  revalidate={revalidate}
                  chartsMarkdown={chartsMarkdown}
                />
              }
            />
          );
        })}
      </List.Section>

      <List.Section title="Latest Records">
        {latest.map((record) => {
          const money = recordSignedMoney(record);
          return (
            <List.Item
              key={record.id}
              icon={{
                source:
                  money && money.value < 0 ? Icon.ArrowDown : Icon.ArrowUp,
                tintColor: money && money.value < 0 ? Color.Red : Color.Green,
              }}
              title={
                record.counterParty ||
                record.note ||
                record.category?.name ||
                "Record"
              }
              subtitle={record.category?.name}
              accessories={[
                { text: formatDate(record.recordDate) },
                {
                  text: money
                    ? {
                        value: formatMoney(money),
                        color: money.value < 0 ? Color.Red : Color.Green,
                      }
                    : "—",
                },
              ]}
              actions={
                <DashboardActions
                  revalidate={revalidate}
                  chartsMarkdown={chartsMarkdown}
                />
              }
            />
          );
        })}
      </List.Section>
    </List>
  );
}

function DashboardActions({
  revalidate,
  chartsMarkdown,
}: {
  revalidate: () => void;
  chartsMarkdown: string;
}) {
  return (
    <ActionPanel>
      <Action.Push
        title="View Charts"
        icon={Icon.BarChart}
        target={
          <Detail markdown={chartsMarkdown} navigationTitle="Wallet Charts" />
        }
        shortcut={{ modifiers: ["cmd"], key: "g" }}
      />
      <Action.Push
        title="Add Record"
        icon={Icon.Plus}
        target={<RecordForm onDone={revalidate} />}
        shortcut={Keyboard.Shortcut.Common.New}
      />
      <Action
        title="Refresh"
        icon={Icon.ArrowClockwise}
        onAction={revalidate}
        shortcut={Keyboard.Shortcut.Common.Refresh}
      />
    </ActionPanel>
  );
}
