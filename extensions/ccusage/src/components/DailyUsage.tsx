import { List, Icon, ActionPanel, Action, Color, getPreferenceValues, openExtensionPreferences } from "@raycast/api";
import { DailyUsageData, Preferences } from "../types/usage-types";
import {
  formatTokens,
  formatCost,
  formatDateWithTimezone,
  getTokenEfficiency,
  getCostPerMTok,
} from "../utils/data-formatter";
import { getUsageIntensity } from "../utils/usage-calculator";
import { ReactNode } from "react";

type DailyUsageProps = {
  dailyUsage: DailyUsageData | null;
  isLoading: boolean;
  error?: string;
  settingsActions?: ReactNode;
};

export function DailyUsage({ dailyUsage, isLoading, error, settingsActions }: DailyUsageProps) {
  const preferences = getPreferenceValues<Preferences>();
  const getTrendIcon = (usage: DailyUsageData | null): Icon => {
    if (!usage) return Icon.Calendar;

    const intensity = getUsageIntensity(usage.totalTokens);
    switch (intensity) {
      case "Low":
        return Icon.Circle;
      case "Medium":
        return Icon.CircleProgress25;
      case "High":
        return Icon.CircleProgress75;
      case "Very High":
        return Icon.CircleProgress100;
      default:
        return Icon.Calendar;
    }
  };

  const getTrendColor = (usage: DailyUsageData | null): Color => {
    if (!usage) return Color.SecondaryText;

    const intensity = getUsageIntensity(usage.totalTokens);
    switch (intensity) {
      case "Low":
        return Color.Green;
      case "Medium":
        return Color.Yellow;
      case "High":
        return Color.Orange;
      case "Very High":
        return Color.Red;
      default:
        return Color.SecondaryText;
    }
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
          <List.Item.Detail.Metadata.Label title="Date" text={new Date().toLocaleDateString()} />
        </List.Item.Detail.Metadata>
      );
    }

    const efficiency = getTokenEfficiency(dailyUsage.inputTokens, dailyUsage.outputTokens);
    const costPerMTok = getCostPerMTok(dailyUsage.cost, dailyUsage.totalTokens);
    const intensity = getUsageIntensity(dailyUsage.totalTokens);

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Date"
          text={formatDateWithTimezone(dailyUsage.date, preferences.timezone)}
          icon={Icon.Calendar}
        />
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
        <List.Item.Detail.Metadata.Label
          title="Usage Intensity"
          text={intensity}
          icon={{ source: getTrendIcon(dailyUsage), tintColor: getTrendColor(dailyUsage) }}
        />
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
      icon={{ source: getTrendIcon(dailyUsage), tintColor: getTrendColor(dailyUsage) }}
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
