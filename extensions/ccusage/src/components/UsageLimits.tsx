import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useClaudeUsageLimits } from "../hooks/useClaudeUsageLimits";
import {
  formatTimeRemaining,
  formatRelativeTime,
  getUtilizationColor,
  calculateEstimatedUsage,
  calculateAverageUsage,
} from "../utils/usage-limits-formatter";
import { UsageLimitsError, sanitizeCodeBlock } from "../utils/usage-limits-error";
import { ErrorMetadata } from "./ErrorMetadata";
import { ReactNode } from "react";
import { STANDARD_ACCESSORIES } from "./common/accessories";

type UsageLimitsAccessoriesInput = {
  hasData: boolean;
  error: UsageLimitsError | null;
  isStale: boolean;
  lastFetched: Date | null;
  fiveHourUtilization: number;
};

const getUsageLimitsErrorIcon = () => ({
  source: Icon.ExclamationMark,
  tintColor: Color.Red,
});

const getUsageLimitsAccessories = ({
  hasData,
  error,
  isStale,
  lastFetched,
  fiveHourUtilization,
}: UsageLimitsAccessoriesInput): List.Item.Accessory[] => {
  if (error) {
    return [{ text: "Error", icon: getUsageLimitsErrorIcon() }];
  }

  if (!hasData) {
    return STANDARD_ACCESSORIES.LOADING;
  }

  if (isStale) {
    return [{ icon: Icon.Warning, tooltip: `Stale data (last updated ${formatRelativeTime(lastFetched)})` }];
  }

  return [
    {
      icon: Icon.Gauge,
      text: `${fiveHourUtilization.toFixed(0)}%`,
      tooltip: "5-Hour Limit (higher priority)",
    },
  ];
};

const getUsageLimitsErrorMarkdown = (error: UsageLimitsError): string => {
  return [
    `# ${error.title}`,
    "",
    error.message,
    "",
    "## Error Log",
    "",
    "```text",
    sanitizeCodeBlock(error.log),
    "```",
  ].join("\n");
};

export function UsageLimits() {
  const { data, isLoading, error, isStale, lastFetched, revalidate, isUsageLimitsAvailable } = useClaudeUsageLimits();

  if (!isUsageLimitsAvailable) {
    return null;
  }

  const fiveHourUtil = data?.five_hour?.utilization ?? 0;
  const sevenDayUtil = data?.seven_day?.utilization ?? 0;

  const accessories = getUsageLimitsAccessories({
    hasData: Boolean(data),
    error,
    isStale,
    lastFetched,
    fiveHourUtilization: fiveHourUtil,
  });

  const renderDetailMetadata = (): ReactNode => {
    if (error) {
      return null;
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
          text={
            data.five_hour.resets_at
              ? `${formatTimeRemaining(data.five_hour.resets_at)} || ${new Date(data.five_hour.resets_at).toLocaleString()}`
              : "N/A"
          }
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
          text={
            data.seven_day.resets_at
              ? `${formatTimeRemaining(data.seven_day.resets_at)} || ${new Date(data.seven_day.resets_at).toLocaleString()}`
              : "N/A"
          }
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
      icon={Icon.Gauge}
      accessories={accessories}
      detail={
        error ? (
          <List.Item.Detail markdown={getUsageLimitsErrorMarkdown(error)} />
        ) : (
          <List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />
        )
      }
      actions={
        <ActionPanel>
          <Action title="Refresh Usage Limit" icon={Icon.ArrowClockwise} onAction={revalidate} />
          {error && <Action.CopyToClipboard title="Copy Error Log" content={error.log} icon={Icon.Clipboard} />}
        </ActionPanel>
      }
    />
  );
}
