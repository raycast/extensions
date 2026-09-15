import {
  Action,
  ActionPanel,
  Color,
  environment,
  Grid,
  Icon,
  Keyboard,
  launchCommand,
  LaunchType,
  List,
} from "@raycast/api";
import { useEffect, useState } from "react";
import { ForecastActions, WEBSITE_URL } from "./components/forecast-actions";
import { ForecastHistoryItem } from "./components/forecast-history-item";
import {
  calendarMonthDescription,
  calendarMonthImage,
  calendarMonthSummary,
  resetCalendar,
} from "./domain/reset-calendar";
import { useForecast } from "./hooks/use-forecast";

export default function Command() {
  const { data, error, isLoading, revalidate, warning } = useForecast();
  const months = data ? resetCalendar(data.response) : [];
  const currentMonthId = months.find((month) => month.isCurrent)?.key;
  const [selectedMonth, setSelectedMonth] = useState<string>();
  // Apply the initial selection after the native grid has received its items.
  useEffect(() => setSelectedMonth(currentMonthId), [currentMonthId]);

  return (
    <Grid
      columns={2}
      aspectRatio="1"
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
      selectedItemId={selectedMonth}
      searchBarPlaceholder="Select a Month, Then Press Enter to View Records…"
    >
      <Grid.EmptyView
        icon={isLoading ? Icon.Clock : data ? Icon.Calendar : Icon.Warning}
        title={isLoading ? "Loading Reset Calendar" : data ? "No Matching Month" : "Reset Calendar Unavailable"}
        description={
          data
            ? "Clear your search to see the recent two months."
            : (error?.message ?? "Fetching recent reset records.")
        }
        actions={<ForecastActions onRefresh={revalidate} />}
      />
      <Grid.Section title={warning ? "Data Status" : undefined} subtitle={warning}>
        {months.map((month) => (
          <Grid.Item
            key={month.key}
            id={month.key}
            content={{
              value: { source: calendarMonthImage(month, environment.appearance) },
              tooltip: calendarMonthDescription(month),
            }}
            keywords={[month.label, month.key]}
            actions={
              <ActionPanel>
                <Action.Push
                  title="View Month’s Reset Records"
                  icon={Icon.List}
                  target={<MonthRecords monthKey={month.key} />}
                />
                <Action
                  title="View Outlook and Full History"
                  icon={Icon.Gauge}
                  onAction={() => launchCommand({ name: "check-reset-forecast", type: LaunchType.UserInitiated })}
                />
                <Action.CopyToClipboard title="Copy Month Summary" content={calendarMonthDescription(month)} />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action.OpenInBrowser title="Open Codex Reset Monitor" url={WEBSITE_URL} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
    </Grid>
  );
}

function MonthRecords({ monthKey }: { monthKey: string }) {
  const { data, error, isLoading, revalidate, warning } = useForecast();
  const month = data ? resetCalendar(data.response).find((item) => item.key === monthKey) : undefined;
  const days = month?.days.filter((day) => day.records.length).reverse() ?? [];
  return (
    <List
      navigationTitle={month?.label ?? "Reset Records"}
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search This Month’s Reset Records…"
    >
      <List.EmptyView
        icon={Icon.Calendar}
        title={isLoading ? "Loading Reset Records" : "No Reset Records"}
        description={error?.message ?? `No matching confirmed reset records in ${month?.label ?? "this month"}.`}
        actions={<ForecastActions onRefresh={revalidate} />}
      />
      {warning && days.length ? (
        <List.Section title="Data Status">
          <List.Item
            title="Source Status"
            icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
            detail={<List.Item.Detail markdown={warning} />}
            actions={<ForecastActions onRefresh={revalidate} />}
          />
        </List.Section>
      ) : null}
      <List.Section title={month?.label} subtitle={month ? calendarMonthSummary(month) : undefined}>
        {days.flatMap((day) =>
          day.records.map((record) => <ForecastHistoryItem key={record.id} record={record} onRefresh={revalidate} />),
        )}
      </List.Section>
    </List>
  );
}
