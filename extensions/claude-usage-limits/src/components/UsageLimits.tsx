import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { getProgressIcon } from "@raycast/utils";
import { useClaudeUsageLimits } from "../hooks/useClaudeUsageLimits";
import { formatResetTime, formatRelativeTime, calculateEstimatedUsage } from "../utils/usage-limits-formatter";
import { formatDuration } from "../utils/data-formatter";
import { getLimitRows } from "../utils/limit-rows";
import { showRemainingUsage } from "../preferences";
import { ErrorMetadata } from "./ErrorMetadata";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { Fragment, ReactNode } from "react";
import { capitalize } from "es-toolkit";

const rowName = (label: string, period: string | null): string => (period ? `${label} ${capitalize(period)}` : label);

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

  const rows = getLimitRows(data);
  const [primaryRow] = rows;
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
            : !primaryRow
              ? STANDARD_ACCESSORIES.NO_DATA
              : [
                  {
                    text: `${(preferRemaining ? 100 - primaryRow.utilization : primaryRow.utilization).toFixed(0)}%`,
                    tooltip: `${`${rowName(primaryRow.label, primaryRow.period)} Limit`} · ${preferRemaining ? "Remaining" : "Consumed"} (higher priority)`,
                  },
                ];

  const renderDetailMetadata = (): ReactNode => {
    if (error && !data) {
      return <ErrorMetadata noDataMessage="Unable to fetch usage limits" noDataSubMessage={error.message} />;
    }

    if (isRateLimited && !data) {
      return (
        <ErrorMetadata
          noDataMessage={rateLimitRetryIn ? `Rate limited — retry in ${rateLimitRetryIn}` : "Rate limited"}
          noDataSubMessage="Click Refresh to try now"
        />
      );
    }

    if (!data) {
      return <ErrorMetadata noDataMessage="Loading usage limits..." noDataSubMessage="Reading from Brim" />;
    }

    return (
      <List.Item.Detail.Metadata>
        {rows.map((row) => {
          const estimate =
            row.windowHours === null ? null : calculateEstimatedUsage(row.utilization, row.resets_at, row.windowHours);
          const name = rowName(row.label, row.period);
          const level = row.utilization >= 90 ? Color.Red : row.utilization >= 70 ? Color.Orange : Color.Green;
          return (
            <Fragment key={name}>
              <List.Item.Detail.Metadata.Label
                title={`${name} Limit`}
                icon={getProgressIcon(Math.min(row.utilization, 100) / 100, level)}
                text={`${row.utilization.toFixed(0)}% Used`}
              />
              {row.resets_at ? (
                <List.Item.Detail.Metadata.Label title="Resets By" text={formatResetTime(row.resets_at)} />
              ) : null}
              {estimate === null ? null : (
                <List.Item.Detail.Metadata.TagList title="On Pace For">
                  <List.Item.Detail.Metadata.TagList.Item
                    text={`${estimate.toFixed(0)}%`}
                    color={estimate >= 90 ? Color.Red : estimate >= 70 ? Color.Orange : Color.Green}
                  />
                </List.Item.Detail.Metadata.TagList>
              )}
              <List.Item.Detail.Metadata.Separator />
            </Fragment>
          );
        })}
        {lastFetched ? (
          <List.Item.Detail.Metadata.Label
            title="Updated"
            text={`${formatRelativeTime(lastFetched)}${isStale ? " · May Be Stale" : ""}`}
          />
        ) : null}
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="usage-limits"
      title="Usage Limits"
      icon={Icon.Gauge}
      accessories={accessories}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={
        <ActionPanel>
          <Action title="Refresh Usage Limits" icon={Icon.ArrowClockwise} onAction={revalidate} />
        </ActionPanel>
      }
    />
  );
}
