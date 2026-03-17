import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { toshl } from "./utils/toshl";
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear } from "date-fns";
import { useState } from "react";

type PeriodType = "this_month" | "this_year";

export default function Planning() {
  const [period, setPeriod] = useState<PeriodType>("this_month");
  const today = new Date();

  // Calculate date range based on period
  const getDateRange = () => {
    if (period === "this_month") {
      return {
        from: format(startOfMonth(today), "yyyy-MM-dd"),
        to: format(endOfMonth(today), "yyyy-MM-dd"),
        label: format(today, "MMMM yyyy"),
      };
    } else {
      return {
        from: format(startOfYear(today), "yyyy-MM-dd"),
        to: format(endOfYear(today), "yyyy-MM-dd"),
        label: format(today, "yyyy"),
      };
    }
  };

  const dateRange = getDateRange();

  const {
    data: planning,
    isLoading,
    error,
  } = useCachedPromise(
    async (from: string, to: string) => toshl.getPlanning({ from, to }),
    [dateRange.from, dateRange.to],
    { keepPreviousData: true },
  );

  const formatAmount = (amount: number) => {
    const absAmount = Math.abs(amount);
    if (absAmount >= 1000000) {
      return `${(absAmount / 1000000).toFixed(1)}M`;
    }
    if (absAmount >= 1000) {
      return `${(absAmount / 1000).toFixed(0)}k`;
    }
    return absAmount.toFixed(0);
  };

  const getBalanceColor = (balance: number) => {
    if (balance > 0) return Color.Green;
    if (balance < 0) return Color.Red;
    return Color.SecondaryText;
  };

  const getBalanceIcon = (balance: number) => {
    if (balance > 0) return Icon.ArrowUp;
    if (balance < 0) return Icon.ArrowDown;
    return Icon.Minus;
  };

  // Handle 403 error for non-Pro users
  if (error) {
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 403) {
      return (
        <List>
          <List.EmptyView
            icon={Icon.Lock}
            title="Pro Feature"
            description="Planning is a Pro feature. Upgrade your Toshl account to access it."
          />
        </List>
      );
    }
  }

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown tooltip="Select Period" value={period} onChange={(v) => setPeriod(v as PeriodType)}>
          <List.Dropdown.Item title="This Month" value="this_month" />
          <List.Dropdown.Item title="This Year" value="this_year" />
        </List.Dropdown>
      }
    >
      {/* Summary Section */}
      {planning && (
        <List.Section title={`Planning: ${dateRange.label}`}>
          <List.Item
            icon={{ source: Icon.LineChart, tintColor: Color.Blue }}
            title="Average Overview"
            accessories={[
              { text: `Expenses: ${formatAmount(planning.avg.expenses)}` },
              { text: `Incomes: ${formatAmount(planning.avg.incomes)}` },
              {
                text: `Balance: ${planning.avg.balance >= 0 ? "+" : ""}${formatAmount(planning.avg.balance)}`,
                icon: {
                  source: getBalanceIcon(planning.avg.balance),
                  tintColor: getBalanceColor(planning.avg.balance),
                },
              },
            ]}
            detail={
              <List.Item.Detail
                metadata={
                  <List.Item.Detail.Metadata>
                    <List.Item.Detail.Metadata.Label
                      title="Average Expenses"
                      text={formatAmount(planning.avg.expenses)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Average Incomes"
                      text={formatAmount(planning.avg.incomes)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Average Balance"
                      text={formatAmount(planning.avg.balance)}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Average Net Worth"
                      text={formatAmount(planning.avg.networth)}
                    />
                    <List.Item.Detail.Metadata.Separator />
                    <List.Item.Detail.Metadata.Label
                      title="Expense Range"
                      text={`${formatAmount(planning.ranges.expenses.min)} - ${formatAmount(planning.ranges.expenses.max)}`}
                    />
                    <List.Item.Detail.Metadata.Label
                      title="Income Range"
                      text={`${formatAmount(planning.ranges.incomes.min)} - ${formatAmount(planning.ranges.incomes.max)}`}
                    />
                  </List.Item.Detail.Metadata>
                }
              />
            }
            actions={
              <ActionPanel>
                <Action.OpenInBrowser title="Open Toshl" url="https://toshl.com/app/#/planning/balance" />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {/* Planning Periods */}
      {planning?.planning.map((p, index) => (
        <List.Section key={index} title={`${p.from} → ${p.to}`}>
          <List.Item
            icon={{ source: Icon.BankNote, tintColor: Color.Red }}
            title="Expenses"
            subtitle={`Actual: ${formatAmount(p.expenses.sum)}`}
            accessories={[
              { text: `Planned: ${formatAmount(p.expenses.planned)}`, icon: Icon.Calendar },
              { text: `Predicted: ${formatAmount(p.expenses.predicted)}`, icon: Icon.Eye },
            ]}
          />
          <List.Item
            icon={{ source: Icon.Coins, tintColor: Color.Green }}
            title="Incomes"
            subtitle={`Actual: ${formatAmount(p.incomes.sum)}`}
            accessories={[
              { text: `Planned: ${formatAmount(p.incomes.planned)}`, icon: Icon.Calendar },
              { text: `Predicted: ${formatAmount(p.incomes.predicted)}`, icon: Icon.Eye },
            ]}
          />
          <List.Item
            icon={{ source: getBalanceIcon(p.balance.sum), tintColor: getBalanceColor(p.balance.sum) }}
            title="Balance"
            subtitle={`Actual: ${p.balance.sum >= 0 ? "+" : ""}${formatAmount(p.balance.sum)}`}
            accessories={[
              { text: `Planned: ${formatAmount(p.balance.planned)}`, icon: Icon.Calendar },
              { text: `Predicted: ${formatAmount(p.balance.predicted)}`, icon: Icon.Eye },
            ]}
          />
        </List.Section>
      ))}

      {!planning && !isLoading && (
        <List.EmptyView
          icon={Icon.Calendar}
          title="No Planning Data"
          description="No planning data available for this period."
        />
      )}
    </List>
  );
}
