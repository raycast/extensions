import { Color, Detail, Icon, List } from "@raycast/api";
import { ForecastActions, WEBSITE_URL } from "./components/forecast-actions";
import { ForecastHistoryItem } from "./components/forecast-history-item";
import { forecastSummary } from "./domain/forecast-copy";
import {
  formatCompactDurationSince,
  formatDateTime,
  formatPercentage,
  formatRelativeTime,
} from "./domain/format-forecast";
import { useForecast } from "./hooks/use-forecast";

export default function Command() {
  const { data, error, isLoading, revalidate } = useForecast();
  const response = data?.response;
  const isStale = data?.isStale ?? false;

  if (!response) {
    return (
      <List isLoading={isLoading} searchBarPlaceholder="Search Forecast History...">
        {!isLoading ? (
          <List.EmptyView
            icon={Icon.Warning}
            title="Forecast Unavailable"
            description={error?.message ?? "The forecast could not be loaded and no cached response is available."}
            actions={<ForecastActions copyContent={error?.message ?? "Forecast unavailable"} onRefresh={revalidate} />}
          />
        ) : null}
      </List>
    );
  }

  const lastSuccessfulRequestAt = data.lastSuccessfulRequestAt;
  const staleAccessories: List.Item.Accessory[] = isStale ? [{ tag: { value: "STALE", color: Color.Yellow } }] : [];
  const summary = forecastSummary(response, lastSuccessfulRequestAt);
  const likelihoodMarkdown = [
    `# ${formatPercentage(response.forecast.score)} Reset Likelihood`,
    "The percentage is the website's forecast for a surprise Codex usage-limit reset. It is not your remaining quota or regular reset schedule.",
    `Last checked: **${formatDateTime(lastSuccessfulRequestAt)}**`,
    isStale ? `> Cached data: ${data.warning ?? "the latest refresh failed"}` : "",
    `[Open Will Codex Reset?](${WEBSITE_URL})`,
  ]
    .filter(Boolean)
    .join("\n\n");
  const lastResetMarkdown = [
    "# Last Confirmed Reset",
    `The latest confirmed reset was **${formatRelativeTime(response.forecast.latestResetAt)}**.`,
    `Recorded at: **${formatDateTime(response.forecast.latestResetAt)}**`,
    "Confirmed resets are detected from the upstream event label, not inferred from the forecast percentage.",
  ].join("\n\n");

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Search Forecast History...">
      <List.Section title="Current Forecast">
        <List.Item
          icon={{ source: Icon.Gauge, tintColor: Color.Blue }}
          title="Reset Likelihood"
          subtitle={`Last checked ${formatRelativeTime(lastSuccessfulRequestAt)}`}
          accessories={[...staleAccessories, { text: formatPercentage(response.forecast.score) }]}
          actions={
            <ForecastActions
              detail={
                <Detail
                  markdown={likelihoodMarkdown}
                  actions={<ForecastActions copyContent={summary} onRefresh={revalidate} />}
                />
              }
              copyContent={summary}
              onRefresh={revalidate}
            />
          }
        />
        <List.Item
          icon={{ source: Icon.CheckCircle, tintColor: Color.Green }}
          title="Last Confirmed Reset"
          subtitle={formatDateTime(response.forecast.latestResetAt)}
          accessories={[...staleAccessories, { text: formatCompactDurationSince(response.forecast.latestResetAt) }]}
          actions={
            <ForecastActions
              detail={
                <Detail
                  markdown={lastResetMarkdown}
                  actions={<ForecastActions copyContent={summary} onRefresh={revalidate} />}
                />
              }
              copyContent={summary}
              onRefresh={revalidate}
            />
          }
        />
      </List.Section>

      <List.Section title="Recent History" subtitle={`${response.history.length} changes`}>
        {response.history.length === 0 ? (
          <List.Item
            icon={{ source: Icon.Clock, tintColor: Color.SecondaryText }}
            title="No Recent Forecast Changes"
            subtitle="The source returned no recent history."
          />
        ) : (
          response.history.map((entry) => (
            <ForecastHistoryItem
              key={`${entry.at}-${entry.fromScore}-${entry.toScore}`}
              entry={entry}
              isStale={isStale}
              onRefresh={revalidate}
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
