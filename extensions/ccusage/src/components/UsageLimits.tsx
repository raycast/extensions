import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useClaudeUsageLimits } from "../hooks/useClaudeUsageLimits";
import {
  formatTimeRemaining,
  formatRelativeTime,
  getUtilizationColor,
  calculateEstimatedUsage,
  calculateAverageUsage,
  createProgressBar,
} from "../utils/usage-limits-formatter";
import { formatDuration } from "../utils/data-formatter";
import { getLimitRows } from "../utils/limit-rows";
import { showRemainingUsage } from "../preferences";
import { ErrorMetadata } from "./ErrorMetadata";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import React, { ReactNode } from "react";
import { capitalize } from "es-toolkit";

const rowTitle = (label: string, period: string | null): string =>
  period ? `${label} ${capitalize(period)} Limit` : `${label} Usage Limit`;

export function UsageLimits() {
  const {
    data,
    isLoading,
    error,
    isStale,
    isRateLimited,
    rateLimitedUntil,
    lastFetched,
    revalidate,
    isUsageLimitsAvailable,
  } = useClaudeUsageLimits();

  const rateLimitRetryIn =
    rateLimitedUntil && rateLimitedUntil > Date.now() ? formatDuration(rateLimitedUntil - Date.now()) : null;

  if (!isUsageLimitsAvailable) {
    return null;
  }

  const fiveHourUtil = data?.five_hour?.utilization ?? 0;
  const preferRemaining = showRemainingUsage();

  const accessories: List.Item.Accessory[] =
    error && !data
      ? STANDARD_ACCESSORIES.ERROR
      : isRateLimited && !data
        ? [
            {
              icon: Icon.Clock,
              text: rateLimitRetryIn ? `Rate limited · retry in ${rateLimitRetryIn}` : "Rate limited",
            },
          ]
        : !data
          ? STANDARD_ACCESSORIES.LOADING
          : isStale && !isLoading
            ? [{ icon: Icon.Warning, tooltip: `Stale data (last updated ${formatRelativeTime(lastFetched)})` }]
            : [
                {
                  icon: Icon.Gauge,
                  text: `${(preferRemaining ? 100 - fiveHourUtil : fiveHourUtil).toFixed(0)}%`,
                  tooltip: `5-Hour Limit · ${preferRemaining ? "Remaining" : "Consumed"} (higher priority)`,
                },
              ];

  const renderDetailMetadata = (): ReactNode => {
    if (error && !data) {
      return (
        <ErrorMetadata
          noDataMessage="Unable to fetch usage limits"
          noDataSubMessage="Re-authenticate by running: claude login"
        />
      );
    }

    if (isRateLimited && !data) {
      return (
        <ErrorMetadata
          noDataMessage={
            rateLimitRetryIn ? `Rate limited — retry in ${rateLimitRetryIn}` : "Rate limited by Anthropic API"
          }
          noDataSubMessage="Click Refresh to try now"
        />
      );
    }

    if (!data) {
      return <ErrorMetadata noDataMessage="Loading usage limits..." noDataSubMessage="Fetching data from Claude API" />;
    }

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

        {getLimitRows(data).map((row, index) => {
          const average = row.windowHours === null ? null : calculateAverageUsage(row.resets_at, row.windowHours);
          const estimate =
            row.windowHours === null ? null : calculateEstimatedUsage(row.utilization, row.resets_at, row.windowHours);

          return (
            <React.Fragment key={row.key}>
              {index > 0 && <List.Item.Detail.Metadata.Separator />}
              <List.Item.Detail.Metadata.Label
                title={rowTitle(row.label, row.period)}
                icon={row.windowHours !== null && row.windowHours <= 24 ? Icon.Clock : Icon.Calendar}
              />
              <List.Item.Detail.Metadata.Label
                title="Utilization"
                text={`${row.utilization.toFixed(row.decimals)}%`}
                icon={{ source: Icon.BarChart, tintColor: getUtilizationColor(row.utilization) }}
              />
              <List.Item.Detail.Metadata.Label title="Progress" text={createProgressBar(row.utilization)} />
              {average !== null && (
                <List.Item.Detail.Metadata.Label
                  title="Average Usage"
                  text={`${average.toFixed(1)}%`}
                  icon={{ source: Icon.Circle, tintColor: Color.SecondaryText }}
                />
              )}
              {estimate !== null && (
                <List.Item.Detail.Metadata.Label
                  title="Estimated Usage"
                  text={`${estimate.toFixed(1)}%`}
                  icon={{ source: Icon.LineChart, tintColor: getUtilizationColor(estimate) }}
                />
              )}
              <List.Item.Detail.Metadata.Label
                title="Resets in"
                text={
                  row.resets_at
                    ? `${formatTimeRemaining(row.resets_at)} · ${new Date(row.resets_at).toLocaleString("en-US", { hour12: false })}`
                    : "N/A"
                }
                icon={Icon.ArrowClockwise}
              />
            </React.Fragment>
          );
        })}

        {isStale && !isLoading && (
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
