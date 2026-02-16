import { List, Icon, Color, Action, ActionPanel } from "@raycast/api";
import { useWeeklyUsage } from "../hooks/useWeeklyUsage";
import { formatCost, formatNumber } from "../utils/data-formatter";
import { ErrorMetadata } from "./ErrorMetadata";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { StandardActions } from "./common/StandardActions";
import { ReactNode } from "react";
import { addDays, format } from "date-fns";

import { WeeklyUsageData } from "../types/usage-types";

export function WeeklyUsage() {
  const { data, isLoading, error, revalidate } = useWeeklyUsage();

  const formatWeekRange = (startDateStr: string): string => {
    try {
      const startDate = new Date(startDateStr);
      const endDate = addDays(startDate, 6);
      return `${format(startDate, "yyyy-MM-dd")} - ${format(endDate, "yyyy-MM-dd")}`;
    } catch {
      return startDateStr;
    }
  };

  const renderDetailMetadata = (item: WeeklyUsageData): ReactNode => {
    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Week" text={formatWeekRange(item.week)} icon={Icon.Calendar} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label
          title="Total Cost"
          text={formatCost(item.totalCost)}
          icon={{ source: Icon.Coins, tintColor: Color.Yellow }}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Token Usage" />
        <List.Item.Detail.Metadata.Label
          title="Total Tokens"
          text={formatNumber(item.totalTokens)}
          icon={Icon.Circle}
        />
        <List.Item.Detail.Metadata.Label
          title="Input Tokens"
          text={formatNumber(item.inputTokens)}
          icon={{ source: Icon.ArrowRight, tintColor: Color.Blue }}
        />
        <List.Item.Detail.Metadata.Label
          title="Output Tokens"
          text={formatNumber(item.outputTokens)}
          icon={{ source: Icon.ArrowLeft, tintColor: Color.Green }}
        />
        <List.Item.Detail.Metadata.Label
          title="Cache Creation"
          text={formatNumber(item.cacheCreationTokens)}
          icon={{ source: Icon.SaveDocument, tintColor: Color.Orange }}
        />
        <List.Item.Detail.Metadata.Label
          title="Cache Read"
          text={formatNumber(item.cacheReadTokens)}
          icon={{ source: Icon.MagnifyingGlass, tintColor: Color.Purple }}
        />

        {item.modelBreakdowns && item.modelBreakdowns.length > 0 && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Model Breakdown" />
            {item.modelBreakdowns.map((model) => (
              <List.Item.Detail.Metadata.Label
                key={model.modelName}
                title={model.modelName}
                text={`${formatCost(model.cost)} (${formatNumber(
                  model.totalTokens || model.inputTokens + model.outputTokens,
                )})`}
              />
            ))}
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  };

  if (error && !data) {
    return (
      <List.Item
        title="Weekly Usage"
        icon={{ source: Icon.Calendar, tintColor: Color.Red }}
        accessories={STANDARD_ACCESSORIES.ERROR}
        detail={
          <List.Item.Detail
            metadata={
              <ErrorMetadata
                error={error}
                noDataMessage="Unable to fetch weekly usage"
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

  if (!data || data.length === 0) {
    return (
      <List.Item
        title="Weekly Usage"
        icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
        accessories={isLoading ? STANDARD_ACCESSORIES.LOADING : STANDARD_ACCESSORIES.NO_DATA}
        detail={
          <List.Item.Detail
            markdown={isLoading ? "Loading weekly usage data..." : "No weekly usage data available yet."}
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

  // Display the most recent week in the main list item
  const currentWeek = data[data.length - 1];

  return (
    <List.Item
      title="Weekly Usage"
      icon={Icon.Calendar}
      accessories={[{ text: formatCost(currentWeek?.totalCost || 0), icon: Icon.Coins }]}
      detail={<List.Item.Detail metadata={currentWeek ? renderDetailMetadata(currentWeek) : undefined} />}
      actions={
        <ActionPanel>
          <StandardActions />
          <Action title="Refresh" onAction={revalidate} icon={Icon.ArrowClockwise} />
        </ActionPanel>
      }
    />
  );
}
