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
import { useMonthlyUsage } from "../hooks/useMonthlyUsage";
import { ErrorMetadata } from "./ErrorMetadata";
import { StandardActions, type ExternalLink } from "./common/StandardActions";

const externalLinks: ExternalLink[] = [
  { title: "View ccusage Repository", url: "https://github.com/ryoppippi/ccusage", icon: Icon.Code },
];

export function MonthlyUsage() {
  const { data: monthlyUsage, previousMonthData, isLoading, error } = useMonthlyUsage();

  const efficiency = useMemo(
    () => (monthlyUsage ? getTokenEfficiency(monthlyUsage.inputTokens, monthlyUsage.outputTokens) : "0.00"),
    [monthlyUsage?.inputTokens, monthlyUsage?.outputTokens],
  );
  const costPerMTok = useMemo(
    () => (monthlyUsage ? getCostPerMTok(monthlyUsage.totalCost, monthlyUsage.totalTokens) : "$0.00"),
    [monthlyUsage?.totalCost, monthlyUsage?.totalTokens],
  );

  const renderDetailMetadata = (): ReactNode => {
    if (!monthlyUsage) {
      return <ErrorMetadata error={error} isLoading={isLoading} noDataMessage="No usage recorded this month" />;
    }

    return (
      <List.Item.Detail.Metadata>
        {error && <List.Item.Detail.Metadata.Label title="Refresh Error" text={error.message} />}
        <List.Item.Detail.Metadata.Label title="Month" text={monthlyUsage.month} />
        {monthlyUsage.metadata?.agents && monthlyUsage.metadata.agents.length > 1 && (
          <List.Item.Detail.Metadata.Label title="Agents" text={monthlyUsage.metadata.agents.join(", ")} />
        )}
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Input Tokens" text={formatTokens(monthlyUsage.inputTokens)} />
        <List.Item.Detail.Metadata.Label title="Output Tokens" text={formatTokens(monthlyUsage.outputTokens)} />
        <List.Item.Detail.Metadata.Label title="Total Tokens" text={formatTokens(monthlyUsage.totalTokens)} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Total Cost" text={formatCost(monthlyUsage.totalCost)} />
        <List.Item.Detail.Metadata.Label title="Cost per MTok" text={costPerMTok} />
        <List.Item.Detail.Metadata.Separator />
        <List.Item.Detail.Metadata.Label title="Output/Input Ratio" text={efficiency} />

        {previousMonthData && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Compared With" text={previousMonthData.month} />
            <List.Item.Detail.Metadata.Label
              title="Cost Change"
              text={formatCostDelta(monthlyUsage.totalCost, previousMonthData.totalCost)}
              icon={
                monthlyUsage.totalCost === previousMonthData.totalCost
                  ? undefined
                  : {
                      source: monthlyUsage.totalCost > previousMonthData.totalCost ? Icon.ArrowUp : Icon.ArrowDown,
                      tintColor: monthlyUsage.totalCost > previousMonthData.totalCost ? Color.Red : Color.Green,
                    }
              }
            />
            <List.Item.Detail.Metadata.Label
              title="Token Change"
              text={formatTokenDelta(monthlyUsage.totalTokens, previousMonthData.totalTokens)}
            />
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="month"
      title="This Month"
      icon={Icon.Calendar}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={<StandardActions externalLinks={externalLinks} />}
    />
  );
}
