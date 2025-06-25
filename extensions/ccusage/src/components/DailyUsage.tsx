import { List, Icon, Color } from "@raycast/api";
import { formatTokens, formatCost, getTokenEfficiency, getCostPerMTok } from "../utils/data-formatter";
import { getCurrentLocalDate } from "../utils/date-formatter";
import { useDailyUsage } from "../hooks/useDailyUsage";
import { ErrorMetadata } from "./ErrorMetadata";
import { StandardActions, type ExternalLink } from "./common/StandardActions";
import { STANDARD_ACCESSORIES } from "./common/accessories";

import { ReactNode, useMemo } from "react";

const externalLinks: ExternalLink[] = [
  { title: "View ccusage Repository", url: "https://github.com/ryoppippi/ccusage", icon: Icon.Code },
];

export function DailyUsage() {
  const { data: dailyUsage, isLoading, error } = useDailyUsage();
  const currentDate = getCurrentLocalDate();

  const efficiency = useMemo(
    () => (dailyUsage ? getTokenEfficiency(dailyUsage.inputTokens, dailyUsage.outputTokens) : "0.00"),
    [dailyUsage?.inputTokens, dailyUsage?.outputTokens],
  );
  const costPerMTok = useMemo(
    () => (dailyUsage ? getCostPerMTok(dailyUsage.totalCost, dailyUsage.totalTokens) : "$0.00"),
    [dailyUsage?.totalCost, dailyUsage?.totalTokens],
  );

  const accessories: List.Item.Accessory[] = error
    ? STANDARD_ACCESSORIES.ERROR
    : dailyUsage === undefined
      ? STANDARD_ACCESSORIES.LOADING
      : !dailyUsage
        ? STANDARD_ACCESSORIES.NO_DATA
        : [{ text: formatCost(dailyUsage.totalCost), icon: Icon.Coins }];

  const renderDetailMetadata = (): ReactNode => {
    if (error || !dailyUsage) {
      return (
        <ErrorMetadata
          error={error}
          noDataMessage={!dailyUsage ? "No usage recorded for today" : undefined}
          noDataSubMessage={!dailyUsage ? `Date: ${currentDate || "Loading..."}` : undefined}
        />
      );
    }

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Date" text={dailyUsage.date} icon={Icon.Calendar} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Token Usage" />
        <List.Item.Detail.Metadata.Label title="Input Tokens" text={formatTokens(dailyUsage.inputTokens)} />
        <List.Item.Detail.Metadata.Label title="Output Tokens" text={formatTokens(dailyUsage.outputTokens)} />
        <List.Item.Detail.Metadata.Label title="Total Tokens" text={formatTokens(dailyUsage.totalTokens)} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Cost Analysis" />
        <List.Item.Detail.Metadata.Label title="Total Cost" text={formatCost(dailyUsage.totalCost)} icon={Icon.Coins} />
        <List.Item.Detail.Metadata.Label title="Cost per MTok" text={costPerMTok} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Efficiency Metrics" />
        <List.Item.Detail.Metadata.Label title="Output/Input Ratio" text={efficiency} />
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="today"
      title="Today"
      icon={{ source: Icon.Calendar, tintColor: Color.SecondaryText }}
      accessories={accessories}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={<StandardActions externalLinks={externalLinks} />}
    />
  );
}
