import { Color, environment, Icon, List } from "@raycast/api";
import { useState } from "react";
import { ForecastActions } from "./components/forecast-actions";
import { ForecastHistoryItem, ResetDetail } from "./components/forecast-history-item";
import { forecastSummary, historySummary, outlookMarkdown } from "./domain/forecast-copy";
import { formatCompactDurationSince } from "./domain/format-forecast";
import { latestReset, resetHistory, type HistoryFilter } from "./domain/reset-history";
import { useForecast } from "./hooks/use-forecast";

export default function Command() {
  const { data, error, isLoading, revalidate, warning } = useForecast();
  const [filter, setFilter] = useState<HistoryFilter>("all");
  const response = data?.response;

  if (!response) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Search Reset History...">
        <List.EmptyView
          icon={isLoading ? Icon.Clock : Icon.Warning}
          title={isLoading ? "Loading Reset Monitor" : "Reset Monitor Unavailable"}
          description={
            isLoading
              ? "Fetching the latest outlook and reset records."
              : (error?.message ?? "The source could not be reached. Try refreshing.")
          }
          actions={<ForecastActions onRefresh={revalidate} />}
        />
      </List>
    );
  }

  const records = resetHistory(response, filter);
  const reset = latestReset(response);

  return (
    <List
      isLoading={isLoading}
      isShowingDetail
      searchBarPlaceholder="Search Dates, Announcements, and Reset Records..."
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter Reset History"
          value={filter}
          onChange={(value) => setFilter(value as HistoryFilter)}
        >
          <List.Dropdown.Item title="All Records" value="all" />
          <List.Dropdown.Item title="Confirmed Resets" value="resets" />
          <List.Dropdown.Item title="Announcements" value="announcements" />
          <List.Dropdown.Item title="Banked Resets" value="banked" />
        </List.Dropdown>
      }
    >
      <List.EmptyView
        title="No Matching Records"
        description="Try a different search or history filter."
        actions={<ForecastActions onRefresh={revalidate} />}
      />
      <List.Section title="Outlook" subtitle={warning ? "Needs Refresh" : "Codex Reset Monitor"}>
        <List.Item
          id="outlook"
          title="Reset Outlook"
          icon={{ source: warning ? Icon.Warning : Icon.Gauge, tintColor: warning ? Color.Yellow : Color.Blue }}
          accessories={[{ text: "24h / 48h" }]}
          detail={
            <List.Item.Detail
              markdown={outlookMarkdown(response, warning, environment.appearance, data.lastSuccessfulRequestAt)}
            />
          }
          actions={<ForecastActions copyContent={forecastSummary(response)} onRefresh={revalidate} />}
        />
        <List.Item
          id="last-reset"
          title="Last Confirmed Reset"
          icon={{ source: Icon.ArrowClockwise, tintColor: Color.Green }}
          accessories={[{ text: reset ? formatCompactDurationSince(reset.dateTime) : "Unknown" }]}
          detail={
            reset ? (
              <ResetDetail record={reset} />
            ) : (
              <List.Item.Detail markdown="# No confirmed reset recorded\n\nThe source has not supplied a completed reset record yet." />
            )
          }
          actions={
            <ForecastActions
              sourceUrl={reset?.sourceUrl}
              copyContent={reset ? historySummary(reset) : undefined}
              copyTitle="Copy Reset Record"
              onRefresh={revalidate}
            />
          }
        />
      </List.Section>
      <List.Section title="Reset History" subtitle={`${records.length} records`}>
        {records.length ? (
          records.map((record) => <ForecastHistoryItem key={record.id} record={record} onRefresh={revalidate} />)
        ) : (
          <List.Item
            title="No Records in This Category"
            icon={Icon.Clock}
            detail={
              <List.Item.Detail markdown="# No records yet\n\nChoose another history filter to browse the available records." />
            }
            actions={<ForecastActions onRefresh={revalidate} />}
          />
        )}
      </List.Section>
    </List>
  );
}
