import { List, Icon, ActionPanel, Action, Color, openExtensionPreferences } from "@raycast/api";
import { DailyUsageData } from "../types/usage-types";
import { formatTokens, formatCost, getTokenEfficiency, getCostPerMTok } from "../utils/data-formatter";
import { useCurrentDate } from "../hooks/use-current-date";
import { ReactNode } from "react";

type DailyUsageProps = {
  dailyUsage: DailyUsageData | null;
  isLoading: boolean;
  error?: string;
  settingsActions?: ReactNode;
};

export function DailyUsage({ dailyUsage, isLoading, error, settingsActions }: DailyUsageProps) {
  const { data: currentDate } = useCurrentDate();
  const getTrendIcon = (): Icon => {
    return Icon.Calendar;
  };

  const getTrendColor = (): Color => {
    return Color.SecondaryText;
  };

  const getDetailMetadata = (): ReactNode => {
    if (error) {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Error" text="ccusage is not available" icon={Icon.ExclamationMark} />
          <List.Item.Detail.Metadata.Label title="Solution" text="Please configure JavaScript runtime in Preferences" />
        </List.Item.Detail.Metadata>
      );
    }

    if (!dailyUsage) {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text="No usage recorded for today" icon={Icon.Calendar} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Date" text={currentDate || "Loading..."} />
        </List.Item.Detail.Metadata>
      );
    }

    const efficiency = getTokenEfficiency(dailyUsage.inputTokens, dailyUsage.outputTokens);
    const costPerMTok = getCostPerMTok(dailyUsage.cost, dailyUsage.totalTokens);

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
        <List.Item.Detail.Metadata.Label title="Total Cost" text={formatCost(dailyUsage.cost)} icon={Icon.Coins} />
        <List.Item.Detail.Metadata.Label title="Cost per MTok" text={costPerMTok} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Efficiency Metrics" />
        <List.Item.Detail.Metadata.Label title="Output/Input Ratio" text={efficiency} />
      </List.Item.Detail.Metadata>
    );
  };

  const getAccessories = (): List.Item.Accessory[] => {
    if (error) {
      return [{ text: "Setup required", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } }];
    }

    if (!dailyUsage) {
      return [{ text: "No usage today", icon: Icon.Calendar }];
    }

    return [{ text: formatCost(dailyUsage.cost), icon: Icon.Coins }];
  };

  return (
    <List.Item
      id="daily"
      title="Today"
      icon={{ source: getTrendIcon(), tintColor: getTrendColor() }}
      accessories={getAccessories()}
      detail={<List.Item.Detail isLoading={isLoading} metadata={getDetailMetadata()} />}
      actions={
        <ActionPanel>
          {error && (
            <Action
              title="Open Preferences"
              icon={Icon.Gear}
              onAction={openExtensionPreferences}
              shortcut={{ modifiers: ["cmd", "shift"], key: "," }}
            />
          )}
          {settingsActions}
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
            shortcut={{ modifiers: ["cmd"], key: "," }}
          />
          <Action.OpenInBrowser
            title="View Ccusage Repository"
            url="https://github.com/ryoppippi/ccusage"
            icon={Icon.Code}
          />
        </ActionPanel>
      }
    />
  );
}
