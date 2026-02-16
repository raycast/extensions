import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useBlocksUsage } from "../hooks/useBlocksUsage";
import { formatCost, formatNumber, formatDateTime } from "../utils/data-formatter";
import { ErrorMetadata } from "./ErrorMetadata";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { StandardActions } from "./common/StandardActions";
import { ReactNode } from "react";

import { SessionBlockData } from "../types/usage-types";

export function BlocksUsage() {
  const { data, isLoading, error, revalidate } = useBlocksUsage();

  const renderDetailMetadata = (block: SessionBlockData): ReactNode => {
    const isActive = block.isActive;
    const isGap = block.isGap;

    // Calculate duration in hours and minutes
    const startTime = new Date(block.startTime);
    const endTime = block.actualEndTime ? new Date(block.actualEndTime) : new Date(block.endTime);
    const durationMs = endTime.getTime() - startTime.getTime();
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const durationStr = `${hours}h ${minutes}m`;

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Status"
          text={isActive ? "Active" : isGap ? "Gap (Inactive)" : "Completed"}
          icon={
            isActive
              ? { source: Icon.CheckCircle, tintColor: Color.Green }
              : isGap
                ? { source: Icon.Circle, tintColor: Color.SecondaryText }
                : { source: Icon.Check, tintColor: Color.Blue }
          }
        />
        <List.Item.Detail.Metadata.Label title="Duration" text={durationStr} icon={Icon.Clock} />
        <List.Item.Detail.Metadata.Label title="Start Time" text={formatDateTime(block.startTime)} />
        <List.Item.Detail.Metadata.Label title="End Time" text={formatDateTime(block.endTime)} />

        {!isGap && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label
              title="Total Cost"
              text={formatCost(block.costUSD)}
              icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
            />
            <List.Item.Detail.Metadata.Label
              title="Total Tokens"
              text={formatNumber(block.totalTokens)}
              icon={Icon.Text}
            />

            {isActive && block.projection && (
              <>
                <List.Item.Detail.Metadata.Separator />
                <List.Item.Detail.Metadata.Label title="Projection" />
                <List.Item.Detail.Metadata.Label
                  title="Projected Cost"
                  text={formatCost(block.projection.totalCost)}
                  icon={{ source: Icon.LineChart, tintColor: Color.Orange }}
                />
                <List.Item.Detail.Metadata.Label
                  title="Projected Tokens"
                  text={formatNumber(block.projection.totalTokens)}
                />
              </>
            )}
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  };

  if (error && !data) {
    return (
      <List.Item
        title="Session Blocks"
        icon={{ source: Icon.Stopwatch, tintColor: Color.Red }}
        accessories={STANDARD_ACCESSORIES.ERROR}
        detail={
          <List.Item.Detail
            metadata={
              <ErrorMetadata
                error={error}
                noDataMessage="Unable to fetch session blocks"
                noDataSubMessage="Please check your ccusage configuration"
              />
            }
          />
        }
        actions={
          <ActionPanel>
            <Action title="Retry" onAction={revalidate} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  // Find the active block or the most recent one
  const activeBlock = data?.find((b) => b.isActive) || (data && data.length > 0 ? data[data.length - 1] : null);

  if (!activeBlock) {
    return (
      <List.Item
        title="Session Blocks"
        icon={{ source: Icon.Stopwatch, tintColor: Color.SecondaryText }}
        accessories={isLoading ? STANDARD_ACCESSORIES.LOADING : STANDARD_ACCESSORIES.NO_DATA}
        detail={
          <List.Item.Detail
            markdown={isLoading ? "Loading session block data..." : "No session block data available."}
          />
        }
        actions={
          <ActionPanel>
            <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
          </ActionPanel>
        }
      />
    );
  }

  return (
    <List.Item
      title="Session Blocks"
      subtitle={activeBlock.isActive ? "Active Session" : "Recent Session"}
      icon={{ source: Icon.Stopwatch, tintColor: Color.SecondaryText }}
      accessories={[
        { text: formatCost(activeBlock.costUSD), icon: Icon.Coins },
        { text: formatNumber(activeBlock.totalTokens), icon: Icon.Terminal, tooltip: "Total Tokens" },
        activeBlock.isActive ? { icon: { source: Icon.CircleFilled, tintColor: Color.Green }, tooltip: "Active" } : {},
      ]}
      detail={<List.Item.Detail metadata={renderDetailMetadata(activeBlock)} />}
      actions={
        <ActionPanel>
          <StandardActions />
          <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    />
  );
}
