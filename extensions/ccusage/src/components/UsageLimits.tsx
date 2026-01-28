import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useClaudeUsageLimits } from "../hooks/useClaudeUsageLimits";
import {
  formatTimeRemaining,
  formatRelativeTime,
  getUtilizationColor,
  calculateEstimatedUsage,
  calculateAverageUsage,
} from "../utils/usage-limits-formatter";
import { ErrorMetadata } from "./ErrorMetadata";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { ReactNode } from "react";

export function UsageLimits() {
  const { data, isLoading, error, isStale, lastFetched, revalidate } = useClaudeUsageLimits();

  const fiveHourUtil = data?.five_hour?.utilization ?? 0;
  const sevenDayUtil = data?.seven_day?.utilization ?? 0;

  const accessories: List.Item.Accessory[] =
    error && !data
      ? STANDARD_ACCESSORIES.ERROR
      : !data
        ? STANDARD_ACCESSORIES.LOADING
        : isStale
          ? [{ icon: Icon.Warning, tooltip: `Stale data (last updated ${formatRelativeTime(lastFetched)})` }]
          : [
              {
                icon: Icon.Gauge,
                text: `${fiveHourUtil.toFixed(0)}%`,
                tooltip: "5-Hour Limit (higher priority)",
              },
            ];

  const renderDetailMetadata = (): ReactNode => {
    if (error && !data) {
      return (
        <ErrorMetadata
          error={error}
          noDataMessage="Unable to fetch usage limits"
          noDataSubMessage="Please ensure Claude Code is authenticated and keychain access is granted"
        />
      );
    }

    if (!data) {
      return (
        <ErrorMetadata
          error={undefined}
          noDataMessage="Loading usage limits..."
          noDataSubMessage="Fetching data from Claude API"
        />
      );
    }

    const fiveHourColor = getUtilizationColor(fiveHourUtil);
    const sevenDayColor = getUtilizationColor(sevenDayUtil);

    const fiveHourAverage = calculateAverageUsage(data.five_hour.resets_at, 5);
    const sevenDayAverage = calculateAverageUsage(data.seven_day.resets_at, 7 * 24);

    const fiveHourEstimate = calculateEstimatedUsage(fiveHourUtil, data.five_hour.resets_at, 5);
    const sevenDayEstimate = calculateEstimatedUsage(sevenDayUtil, data.seven_day.resets_at, 7 * 24);

    const fiveHourEstimateColor =
      fiveHourEstimate !== null ? getUtilizationColor(fiveHourEstimate) : Color.SecondaryText;
    const sevenDayEstimateColor =
      sevenDayEstimate !== null ? getUtilizationColor(sevenDayEstimate) : Color.SecondaryText;

    return (
      <List.Item.Detail.Metadata>
        {lastFetched && (
          <>
            <List.Item.Detail.Metadata.Label
              title="Data Updated At"
              text={lastFetched.toLocaleString()}
              icon={{ source: Icon.Clock, tintColor: Color.Blue }}
            />
            <List.Item.Detail.Metadata.Separator />
          </>
        )}

        <List.Item.Detail.Metadata.Label title="5-Hour Usage Limit" icon={Icon.Clock} />
        <List.Item.Detail.Metadata.Label
          title="Utilization"
          text={`${fiveHourUtil.toFixed(1)}%`}
          icon={{ source: Icon.BarChart, tintColor: fiveHourColor }}
        />
        {fiveHourAverage !== null && (
          <List.Item.Detail.Metadata.Label
            title="Average Usage"
            text={`${fiveHourAverage.toFixed(1)}%`}
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
        )}
        {fiveHourEstimate !== null && (
          <List.Item.Detail.Metadata.Label
            title="Estimated Usage"
            text={`${fiveHourEstimate.toFixed(1)}%`}
            icon={{ source: Icon.LineChart, tintColor: fiveHourEstimateColor }}
          />
        )}
        <List.Item.Detail.Metadata.Label
          title="Resets in"
          text={`${formatTimeRemaining(data.five_hour.resets_at)} || ${new Date(data.five_hour.resets_at).toLocaleString("en-US", { hour12: false })}`}
          icon={Icon.ArrowClockwise}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="7-Day Usage Limit" icon={Icon.Calendar} />
        <List.Item.Detail.Metadata.Label
          title="Utilization"
          text={`${sevenDayUtil.toFixed(1)}%`}
          icon={{ source: Icon.BarChart, tintColor: sevenDayColor }}
        />
        {sevenDayAverage !== null && (
          <List.Item.Detail.Metadata.Label
            title="Average Usage"
            text={`${sevenDayAverage.toFixed(1)}%`}
            icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
          />
        )}
        {sevenDayEstimate !== null && (
          <List.Item.Detail.Metadata.Label
            title="Estimated Usage"
            text={`${sevenDayEstimate.toFixed(1)}%`}
            icon={{ source: Icon.LineChart, tintColor: sevenDayEstimateColor }}
          />
        )}
        <List.Item.Detail.Metadata.Label
          title="Resets in"
          text={`${formatTimeRemaining(data.seven_day.resets_at)} || ${new Date(data.seven_day.resets_at).toLocaleString("en-US", { hour12: false })}`}
          icon={Icon.ArrowClockwise}
        />

        {isStale && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Warning"
              text="Data may be stale"
              icon={{ source: Icon.Warning, tintColor: Color.Yellow }}
            />
            <List.Item.Detail.Metadata.Label title="Last Updated" text={formatRelativeTime(lastFetched)} />
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="usage-limits"
      title="Usage Limits"
      icon={{ source: Icon.Gauge, tintColor: Color.SecondaryText }}
      accessories={accessories}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={
        <ActionPanel>
          <Action title="Refresh Usage Limit" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
