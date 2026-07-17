import { ActionPanel, Action, List, Icon, Color } from "@raycast/api";
import { useKeyMetrics, KeyMetricsOptions, useActivities } from "./api";
import {
  subMonths,
  subWeeks,
  subDays,
  startOfMonth,
  endOfMonth,
  startOfQuarter,
  endOfQuarter,
  startOfYear,
  endOfYear,
  format,
  parseISO,
} from "date-fns";
import { useState, useMemo } from "react";

type TimeRange = "1w" | "1m" | "3m" | "6m" | "1y" | "2y";
type Interval = "day" | "week" | "month" | "quarter" | "year";

function getChangeIcon(value: number, isInverted = false) {
  if (value === 0) {
    return { source: Icon.Minus, tintColor: Color.SecondaryText };
  }

  const isGood = isInverted ? value < 0 : value > 0;
  const isUp = value > 0;

  return {
    source: isUp ? Icon.ArrowUp : Icon.ArrowDown,
    tintColor: isGood ? Color.Green : Color.Red,
  };
}

const timeRanges: Array<{ value: TimeRange; label: string }> = [
  { value: "1w", label: "1 Week" },
  { value: "1m", label: "1 Month" },
  { value: "3m", label: "3 Months" },
  { value: "6m", label: "6 Months" },
  { value: "1y", label: "1 Year" },
  { value: "2y", label: "2 Years" },
];

function getDateRange(timeRange: TimeRange): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  let startDate: Date;

  switch (timeRange) {
    case "1w":
      startDate = subWeeks(endDate, 1);
      break;
    case "1m":
      // Current month MTD: from start of current month to today
      startDate = startOfMonth(endDate);
      break;
    case "3m":
      // Start of 3 months ago to today (current month MTD + 2 full previous months)
      startDate = startOfMonth(subMonths(endDate, 2));
      break;
    case "6m":
      // Start of 6 months ago to today (current month MTD + 5 full previous months)
      startDate = startOfMonth(subMonths(endDate, 5));
      break;
    case "1y":
      // Start of 12 months ago to today (current month MTD + 11 full previous months)
      startDate = startOfMonth(subMonths(endDate, 11));
      break;
    case "2y":
      // Start of 24 months ago to today (current month MTD + 23 full previous months)
      startDate = startOfMonth(subMonths(endDate, 23));
      break;
    default:
      startDate = startOfMonth(subMonths(endDate, 11));
  }

  return { startDate, endDate };
}

function getDefaultInterval(timeRange: TimeRange): Interval {
  switch (timeRange) {
    case "1w":
    case "1m":
      return "day";
    default:
      return "month";
  }
}

function formatCurrency(value: number, currency = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}

function formatPercent(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function getMovementsDateRange(entryDate: string, interval: Interval): { startDate: string; endDate: string } {
  // Parse the ISO date string properly (ChartMogul returns UTC dates)
  const date = parseISO(entryDate);

  switch (interval) {
    case "day":
      return {
        startDate: format(date, "yyyy-MM-dd"),
        endDate: format(date, "yyyy-MM-dd"),
      };
    case "week":
      return {
        startDate: format(subDays(date, 6), "yyyy-MM-dd"), // 7 days total
        endDate: format(date, "yyyy-MM-dd"),
      };
    case "month":
      return {
        startDate: format(startOfMonth(date), "yyyy-MM-dd"),
        endDate: format(endOfMonth(date), "yyyy-MM-dd"),
      };
    case "quarter":
      return {
        startDate: format(startOfQuarter(date), "yyyy-MM-dd"),
        endDate: format(endOfQuarter(date), "yyyy-MM-dd"),
      };
    case "year":
      return {
        startDate: format(startOfYear(date), "yyyy-MM-dd"),
        endDate: format(endOfYear(date), "yyyy-MM-dd"),
      };
    default:
      return {
        startDate: format(startOfMonth(date), "yyyy-MM-dd"),
        endDate: format(endOfMonth(date), "yyyy-MM-dd"),
      };
  }
}

function formatDateByInterval(entryDate: string, interval: Interval): string {
  const date = parseISO(entryDate);

  switch (interval) {
    case "day":
      return format(date, "MMM dd, yyyy");
    case "week":
      return format(date, "MMM dd, yyyy");
    case "month":
      return format(date, "MMM yyyy");
    case "quarter":
      return format(date, "'Q'Q yyyy");
    case "year":
      return format(date, "yyyy");
    default:
      return format(date, "MMM dd, yyyy");
  }
}

function getMovementTypeIcon(type: string): { source: Icon; tintColor: Color } {
  switch (type) {
    case "new_biz":
      return { source: Icon.Plus, tintColor: Color.Green };
    case "reactivation":
      return { source: Icon.ArrowCounterClockwise, tintColor: Color.Blue };
    case "expansion":
      return { source: Icon.ArrowUp, tintColor: Color.Green };
    case "contraction":
      return { source: Icon.ArrowDown, tintColor: Color.Orange };
    case "churn":
      return { source: Icon.XMarkCircle, tintColor: Color.Red };
    default:
      return { source: Icon.Dot, tintColor: Color.SecondaryText };
  }
}

function MovementsForDate({ startDate, endDate, onBack }: { startDate: string; endDate: string; onBack: () => void }) {
  const { data, isLoading, error } = useActivities({
    "start-date": startDate,
    "end-date": endDate,
    "per-page": 50,
  });

  if (error) {
    return (
      <List>
        <List.Item
          title="Error loading movements"
          subtitle={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      </List>
    );
  }

  return (
    <List
      isLoading={isLoading}
      navigationTitle={`Movements: ${format(parseISO(startDate), "MMM dd")} - ${format(parseISO(endDate), "MMM dd")}`}
      actions={
        <ActionPanel>
          <Action title="Back" icon={Icon.ArrowLeft} onAction={onBack} />
        </ActionPanel>
      }
    >
      {data?.entries?.map((entry) => (
        <List.Item
          key={entry.uuid}
          title={entry["customer-name"]}
          subtitle={`${entry.description} on ${format(parseISO(entry.date), "MMM dd")}`}
          icon={getMovementTypeIcon(entry.type)}
          accessories={[
            {
              text: formatCurrency(entry["activity-mrr-movement"] / 100),
            },
          ]}
          detail={
            <List.Item.Detail
              metadata={
                <List.Item.Detail.Metadata>
                  <List.Item.Detail.Metadata.Label title="Customer" text={entry["customer-name"]} />
                  <List.Item.Detail.Metadata.Label title="External ID" text={entry["customer-external-id"] || "N/A"} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="Movement Type"
                    text={entry.type.replace("_", " ").toUpperCase()}
                    icon={getMovementTypeIcon(entry.type)}
                  />
                  <List.Item.Detail.Metadata.Label title="Date" text={format(parseISO(entry.date), "MMMM dd, yyyy")} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label
                    title="MRR Movement"
                    text={formatCurrency(entry["activity-mrr-movement"] / 100)}
                    icon={{
                      source: entry["activity-mrr-movement"] >= 0 ? Icon.ArrowUp : Icon.ArrowDown,
                      tintColor: entry["activity-mrr-movement"] >= 0 ? Color.Green : Color.Red,
                    }}
                  />
                  <List.Item.Detail.Metadata.Label
                    title="Current MRR"
                    text={formatCurrency(entry["activity-mrr"] / 100)}
                  />
                  <List.Item.Detail.Metadata.Label title="ARR" text={formatCurrency(entry["activity-arr"] / 100)} />
                  <List.Item.Detail.Metadata.Separator />
                  <List.Item.Detail.Metadata.Label title="Plan" text={entry["plan-external-id"] || "N/A"} />
                  <List.Item.Detail.Metadata.Label
                    title="Subscription"
                    text={entry["subscription-external-id"] || "N/A"}
                  />
                  <List.Item.Detail.Metadata.Label title="Currency" text={entry.currency} />
                </List.Item.Detail.Metadata>
              }
            />
          }
        />
      ))}
    </List>
  );
}

export default function Command() {
  const [timeRange, setTimeRange] = useState<TimeRange>("1y");
  const [interval, setInterval] = useState<Interval>(getDefaultInterval("1y"));
  const [currentView, setCurrentView] = useState<"main" | "movements">("main");
  const [movementsDateRange, setMovementsDateRange] = useState<{ startDate: string; endDate: string } | null>(null);

  const { startDate, endDate } = useMemo(() => getDateRange(timeRange), [timeRange]);

  const options: KeyMetricsOptions = useMemo(
    () => ({
      "start-date": startDate.toISOString().split("T")[0],
      "end-date": endDate.toISOString().split("T")[0],
      interval,
    }),
    [startDate, endDate, interval],
  );

  const { data, isLoading, error } = useKeyMetrics(options);

  // Handle movements view
  if (currentView === "movements" && movementsDateRange) {
    return (
      <MovementsForDate
        startDate={movementsDateRange.startDate}
        endDate={movementsDateRange.endDate}
        onBack={() => setCurrentView("main")}
      />
    );
  }

  if (error) {
    return (
      <List>
        <List.Item
          title="Error loading key metrics"
          subtitle={error.message}
          icon={{ source: Icon.ExclamationMark, tintColor: Color.Red }}
        />
      </List>
    );
  }

  const latestEntry = data?.entries?.[data.entries.length - 1];

  return (
    <List
      isLoading={isLoading}
      searchBarAccessory={
        <List.Dropdown
          tooltip="Time Range"
          storeValue
          onChange={(value) => {
            const newTimeRange = value as TimeRange;
            setTimeRange(newTimeRange);
            setInterval(getDefaultInterval(newTimeRange));
          }}
          value={timeRange}
        >
          <List.Dropdown.Section title="Time Range">
            {timeRanges.map((range) => (
              <List.Dropdown.Item key={range.value} title={range.label} value={range.value} />
            ))}
          </List.Dropdown.Section>
        </List.Dropdown>
      }
    >
      {latestEntry && (
        <List.Section title="Current Metrics">
          <List.Item
            title="Monthly Recurring Revenue (MRR)"
            subtitle={formatCurrency(latestEntry.mrr / 100)}
            accessories={[
              {
                text: formatPercent(latestEntry["mrr-percentage-change"]),
                icon: getChangeIcon(latestEntry["mrr-percentage-change"]),
              },
            ]}
            icon={{ source: Icon.BankNote, tintColor: Color.Green }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  content={formatCurrency(latestEntry.mrr / 100)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Annual Recurring Revenue (ARR)"
            subtitle={formatCurrency(latestEntry.arr / 100)}
            accessories={[
              {
                text: formatPercent(latestEntry["arr-percentage-change"]),
                icon: getChangeIcon(latestEntry["arr-percentage-change"]),
              },
            ]}
            icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  content={formatCurrency(latestEntry.arr / 100)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Customers"
            subtitle={latestEntry.customers.toLocaleString()}
            accessories={[
              {
                text: formatPercent(latestEntry["customers-percentage-change"]),
                icon: getChangeIcon(latestEntry["customers-percentage-change"]),
              },
            ]}
            icon={{ source: Icon.Person, tintColor: Color.Purple }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  content={latestEntry.customers.toLocaleString()}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Customer Churn Rate"
            subtitle={`${latestEntry["customer-churn-rate"].toFixed(2)}%`}
            accessories={[
              {
                text: formatPercent(latestEntry["customer-churn-rate-percentage-change"]),
                icon: getChangeIcon(latestEntry["customer-churn-rate-percentage-change"], true),
              },
            ]}
            icon={{ source: Icon.XMarkCircle, tintColor: Color.Orange }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  content={`${latestEntry["customer-churn-rate"].toFixed(2)}%`}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Lifetime Value (LTV)"
            subtitle={formatCurrency(latestEntry.ltv / 100)}
            accessories={[
              {
                text: formatPercent(latestEntry["ltv-percentage-change"]),
                icon: getChangeIcon(latestEntry["ltv-percentage-change"]),
              },
            ]}
            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  content={formatCurrency(latestEntry.ltv / 100)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Average Selling Price (ASP)"
            subtitle={formatCurrency(latestEntry.asp / 100)}
            accessories={[
              {
                text: formatPercent(latestEntry["asp-percentage-change"]),
                icon: getChangeIcon(latestEntry["asp-percentage-change"]),
              },
            ]}
            icon={{ source: Icon.Receipt, tintColor: Color.Blue }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  content={formatCurrency(latestEntry.asp / 100)}
                />
              </ActionPanel>
            }
          />
          <List.Item
            title="Average Revenue Per Account (ARPA)"
            subtitle={formatCurrency(latestEntry.arpa / 100)}
            accessories={[
              {
                text: formatPercent(latestEntry["arpa-percentage-change"]),
                icon: getChangeIcon(latestEntry["arpa-percentage-change"]),
              },
            ]}
            icon={{ source: Icon.Calculator, tintColor: Color.SecondaryText }}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Value"
                  icon={Icon.Clipboard}
                  content={formatCurrency(latestEntry.arpa / 100)}
                />
              </ActionPanel>
            }
          />
        </List.Section>
      )}

      {data?.entries && (
        <>
          <List.Section title="Historical Data">
            {data.entries
              .slice()
              .reverse()
              .map((entry) => (
                <List.Item
                  key={entry.date}
                  title={formatDateByInterval(entry.date, interval)}
                  subtitle={`MRR: ${formatCurrency(entry.mrr / 100)} | Customers: ${entry.customers}`}
                  accessories={[
                    {
                      text: `${entry["customer-churn-rate"].toFixed(1)}% churn`,
                    },
                  ]}
                  icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
                  actions={
                    <ActionPanel>
                      <Action
                        title="View Movements for This Period"
                        icon={Icon.ArrowRight}
                        onAction={() => {
                          const dateRange = getMovementsDateRange(entry.date, interval);
                          setMovementsDateRange(dateRange);
                          setCurrentView("movements");
                        }}
                      />
                      <ActionPanel.Section title="Copy Values">
                        <Action.CopyToClipboard
                          title="Copy Mrr"
                          icon={Icon.Clipboard}
                          content={formatCurrency(entry.mrr / 100)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Customer Count"
                          icon={Icon.Clipboard}
                          content={entry.customers.toLocaleString()}
                        />
                        <Action.CopyToClipboard
                          title="Copy Churn Rate"
                          icon={Icon.Clipboard}
                          content={`${entry["customer-churn-rate"].toFixed(1)}%`}
                        />
                        <Action.CopyToClipboard
                          title="Copy Arr"
                          icon={Icon.Clipboard}
                          content={formatCurrency(entry.arr / 100)}
                        />
                        <Action.CopyToClipboard
                          title="Copy Date"
                          icon={Icon.Clipboard}
                          content={formatDateByInterval(entry.date, interval)}
                        />
                      </ActionPanel.Section>
                    </ActionPanel>
                  }
                  detail={
                    <List.Item.Detail
                      metadata={
                        <List.Item.Detail.Metadata>
                          <List.Item.Detail.Metadata.Label
                            title="Date"
                            text={format(parseISO(entry.date), "MMMM dd, yyyy")}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="MRR"
                            text={formatCurrency(entry.mrr / 100)}
                            icon={{ source: Icon.BankNote, tintColor: Color.Green }}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="MRR Change"
                            text={formatPercent(entry["mrr-percentage-change"])}
                            icon={getChangeIcon(entry["mrr-percentage-change"])}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="ARR"
                            text={formatCurrency(entry.arr / 100)}
                            icon={{ source: Icon.Calendar, tintColor: Color.Blue }}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="ARR Change"
                            text={formatPercent(entry["arr-percentage-change"])}
                            icon={getChangeIcon(entry["arr-percentage-change"])}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Customers"
                            text={entry.customers.toLocaleString()}
                            icon={{ source: Icon.Person, tintColor: Color.Purple }}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="Customer Change"
                            text={formatPercent(entry["customers-percentage-change"])}
                            icon={getChangeIcon(entry["customers-percentage-change"])}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="Customer Churn Rate"
                            text={`${entry["customer-churn-rate"].toFixed(2)}%`}
                            icon={{ source: Icon.XMarkCircle, tintColor: Color.Orange }}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="LTV"
                            text={formatCurrency(entry.ltv / 100)}
                            icon={{ source: Icon.Star, tintColor: Color.Yellow }}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="LTV Change"
                            text={formatPercent(entry["ltv-percentage-change"])}
                            icon={getChangeIcon(entry["ltv-percentage-change"])}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="ASP"
                            text={formatCurrency(entry.asp / 100)}
                            icon={{ source: Icon.Receipt, tintColor: Color.Blue }}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="ASP Change"
                            text={formatPercent(entry["asp-percentage-change"])}
                            icon={getChangeIcon(entry["asp-percentage-change"])}
                          />
                          <List.Item.Detail.Metadata.Separator />
                          <List.Item.Detail.Metadata.Label
                            title="ARPA"
                            text={formatCurrency(entry.arpa / 100)}
                            icon={{ source: Icon.Calculator, tintColor: Color.SecondaryText }}
                          />
                          <List.Item.Detail.Metadata.Label
                            title="ARPA Change"
                            text={formatPercent(entry["arpa-percentage-change"])}
                            icon={getChangeIcon(entry["arpa-percentage-change"])}
                          />
                        </List.Item.Detail.Metadata>
                      }
                    />
                  }
                />
              ))}
          </List.Section>
        </>
      )}
    </List>
  );
}
