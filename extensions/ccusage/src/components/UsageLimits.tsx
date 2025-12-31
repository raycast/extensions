import { List, Icon, Color, Action } from "@raycast/api";
import { useClaudeUsageLimits } from "../hooks/useClaudeUsageLimits";
import { formatTimeRemaining, formatRelativeTime, getUtilizationColor } from "../utils/usage-limits-formatter";
import { ErrorMetadata } from "./ErrorMetadata";
import { StandardActions, type ExternalLink } from "./common/StandardActions";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { ReactNode } from "react";

const externalLinks: ExternalLink[] = [
  { title: "View Claude API Documentation", url: "https://docs.anthropic.com/", icon: Icon.Book },
  { title: "Claude Code Authentication", url: "https://github.com/anthropics/claude-code", icon: Icon.Key },
];

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

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="5-Hour Usage Limit" icon={Icon.Clock} />
        <List.Item.Detail.Metadata.Label
          title="Utilization"
          text={`${fiveHourUtil.toFixed(1)}%`}
          icon={{ source: Icon.BarChart, tintColor: fiveHourColor }}
        />
        <List.Item.Detail.Metadata.Label
          title="Resets in"
          text={formatTimeRemaining(data.five_hour.resets_at)}
          icon={Icon.ArrowClockwise}
        />
        <List.Item.Detail.Metadata.Label
          title="Reset Time"
          text={new Date(data.five_hour.resets_at).toLocaleString()}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="7-Day Usage Limit" icon={Icon.Calendar} />
        <List.Item.Detail.Metadata.Label
          title="Utilization"
          text={`${sevenDayUtil.toFixed(1)}%`}
          icon={{ source: Icon.BarChart, tintColor: sevenDayColor }}
        />
        <List.Item.Detail.Metadata.Label
          title="Resets in"
          text={formatTimeRemaining(data.seven_day.resets_at)}
          icon={Icon.ArrowClockwise}
        />
        <List.Item.Detail.Metadata.Label
          title="Reset Time"
          text={new Date(data.seven_day.resets_at).toLocaleString()}
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
        <StandardActions
          externalLinks={externalLinks}
          customActions={<Action title="Refresh" icon={Icon.ArrowClockwise} onAction={revalidate} />}
        />
      }
    />
  );
}
