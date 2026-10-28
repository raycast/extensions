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
import { SOURCE_CREDIT } from "./api/forecast-client";
import { ForecastActions, WEBSITE_URL } from "./components/forecast-actions";
import { ForecastHistoryItem } from "./components/forecast-history-item";
import { calendarMonthDescription, calendarMonthImage, resetCalendar } from "./domain/reset-calendar";
import { useForecast } from "./hooks/use-forecast";

export default function Command() {
  const { data, error, isLoading, revalidate, warning } = useForecast();
  // Current month first also gives the native Grid a reliable initial selection.
  const months = data ? resetCalendar(data.response).reverse() : [];

  return (
    <Grid
      columns={2}
      aspectRatio="1"
      inset={Grid.Inset.Zero}
      isLoading={isLoading}
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
      <Grid.Section title="Data: codex-reset.com" subtitle={warning ?? "Reset and banked updates · UTC"}>
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
                  title="View Month’s Events"
                  icon={Icon.List}
                  target={<MonthRecords monthKey={month.key} />}
                />
                <Action
                  title="View Outlook and Full History"
                  icon={Icon.Gauge}
                  onAction={() => launchCommand({ name: "check-reset-forecast", type: LaunchType.UserInitiated })}
                />
                <Action.CopyToClipboard
                  title="Copy Month Summary"
                  content={`${calendarMonthDescription(month)}\nData: ${WEBSITE_URL}`}
                />
                <Action
                  title="Refresh"
                  icon={Icon.ArrowClockwise}
                  shortcut={Keyboard.Shortcut.Common.Refresh}
                  onAction={revalidate}
                />
                <Action.OpenInBrowser title={SOURCE_CREDIT} url={WEBSITE_URL} />
              </ActionPanel>
            }
          />
        ))}
      </Grid.Section>
      <Grid.Section title="Data Source" columns={4} aspectRatio="16/9">
        <Grid.Item
          title="codex-reset.com"
          subtitle="Open source website"
          content={Icon.Globe}
          actions={
            <ActionPanel>
              <Action.OpenInBrowser title={SOURCE_CREDIT} url={WEBSITE_URL} />
            </ActionPanel>
          }
        />
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
      navigationTitle={month ? `${month.label} · UTC` : "Calendar Events · UTC"}
      isShowingDetail
      isLoading={isLoading}
      searchBarPlaceholder="Search This Month’s Reset and Banked Updates…"
    >
      <List.EmptyView
        icon={Icon.Calendar}
        title={isLoading ? "Loading Events" : "No Events"}
        description={error?.message ?? `No matching reset or banked updates in ${month?.label ?? "this month"}.`}
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
      <List.Section
        title={month?.label}
        subtitle={month ? `${days.reduce((count, day) => count + day.records.length, 0)} records` : undefined}
      >
        {days.flatMap((day) =>
          day.records.map((record) => (
            <ForecastHistoryItem key={record.id} record={record} onRefresh={revalidate} timeZone="UTC" />
          )),
        )}
      </List.Section>
    </List>
  );
}
