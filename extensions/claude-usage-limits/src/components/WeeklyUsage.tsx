import { List, Icon, Color } from "@raycast/api";
import { ReactNode, useMemo } from "react";
import {
  formatTokens,
  formatCost,
  formatCostDelta,
  formatTokenDelta,
  getTokenEfficiency,
  getCostPerMTok,
} from "../utils/data-formatter";
import { useWeeklyUsage } from "../hooks/useWeeklyUsage";
import { ErrorMetadata } from "./ErrorMetadata";
import { StandardActions, type ExternalLink } from "./common/StandardActions";

const externalLinks: ExternalLink[] = [
  { title: "View ccusage Repository", url: "https://github.com/ryoppippi/ccusage", icon: Icon.Code },
];

export function WeeklyUsage() {
  const { data: weeklyUsage, previousWeekData, isLoading, error } = useWeeklyUsage();

  const efficiency = useMemo(
    () => (weeklyUsage ? getTokenEfficiency(weeklyUsage.inputTokens, weeklyUsage.outputTokens) : "0.00"),
    [weeklyUsage?.inputTokens, weeklyUsage?.outputTokens],
  );
  const costPerMTok = useMemo(
    () => (weeklyUsage ? getCostPerMTok(weeklyUsage.totalCost, weeklyUsage.totalTokens) : "$0.00"),
    [weeklyUsage?.totalCost, weeklyUsage?.totalTokens],
  );

  const renderDetailMetadata = (): ReactNode => {
    if (!weeklyUsage) {
      return <ErrorMetadata error={error} isLoading={isLoading} noDataMessage="No usage recorded this week" />;
    }

    return (
      <List.Item.Detail.Metadata>
        {error && <List.Item.Detail.Metadata.Label title="Refresh Error" text={error.message} />}
        <List.Item.Detail.Metadata.Label title="Week of" text={weeklyUsage.week} />
        {weeklyUsage.metadata?.agents && weeklyUsage.metadata.agents.length > 1 && (
          <List.Item.Detail.Metadata.Label title="Agents" text={weeklyUsage.metadata.agents.join(", ")} />
        )}
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Input Tokens" text={formatTokens(weeklyUsage.inputTokens)} />
        <List.Item.Detail.Metadata.Label title="Output Tokens" text={formatTokens(weeklyUsage.outputTokens)} />
        <List.Item.Detail.Metadata.Label title="Total Tokens" text={formatTokens(weeklyUsage.totalTokens)} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Total Cost" text={formatCost(weeklyUsage.totalCost)} />
        <List.Item.Detail.Metadata.Label title="Cost per MTok" text={costPerMTok} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Output/Input Ratio" text={efficiency} />

        {previousWeekData && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Compared With" text={previousWeekData.week} />
            <List.Item.Detail.Metadata.Label
              title="Cost Change"
              text={formatCostDelta(weeklyUsage.totalCost, previousWeekData.totalCost)}
              icon={
                weeklyUsage.totalCost === previousWeekData.totalCost
                  ? undefined
                  : {
                      source: weeklyUsage.totalCost > previousWeekData.totalCost ? Icon.ArrowUp : Icon.ArrowDown,
                      tintColor: weeklyUsage.totalCost > previousWeekData.totalCost ? Color.Red : Color.Green,
                    }
              }
            />
            <List.Item.Detail.Metadata.Label
              title="Token Change"
              text={formatTokenDelta(weeklyUsage.totalTokens, previousWeekData.totalTokens)}
            />
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="week"
      title="This Week"
      icon={Icon.Calendar}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={<StandardActions externalLinks={externalLinks} />}
    />
  );
}
