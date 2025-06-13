import { List, Icon, ActionPanel, Action, Color, openExtensionPreferences } from "@raycast/api";
import { ReactNode } from "react";
import { DailyUsageData, ModelUsage } from "../types/usage-types";
import { formatTokens, formatCost, getCostPerMTok } from "../utils/data-formatter";

type CostAnalysisProps = {
  totalUsage: { inputTokens: number; outputTokens: number; totalTokens: number; cost: number } | null;
  dailyUsage: DailyUsageData | null;
  models: ModelUsage[];
  isLoading: boolean;
  error?: string;
  settingsActions?: ReactNode;
};

export function CostAnalysis({ totalUsage, dailyUsage, models, isLoading, error, settingsActions }: CostAnalysisProps) {
  const getDetailMetadata = (): ReactNode => {
    if (error) {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Error" text="ccusage is not available" icon={Icon.ExclamationMark} />
          <List.Item.Detail.Metadata.Label title="Solution" text="Please configure JavaScript runtime in Preferences" />
        </List.Item.Detail.Metadata>
      );
    }

    if (!totalUsage) {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text="No cost data available" icon={Icon.Circle} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label title="Note" text="Cost analysis will appear after using Claude Code" />
        </List.Item.Detail.Metadata>
      );
    }

    // Calculate cost breakdown inline
    const totalModelCost = models.reduce((sum, model) => sum + model.cost, 0);
    const costBreakdown = {
      totalCost: totalModelCost,
      breakdown: models.map((model) => ({
        model: model.model,
        cost: model.cost,
        percentage: totalModelCost > 0 ? `${((model.cost / totalModelCost) * 100).toFixed(1)}%` : "0%",
      })),
    };

    // Calculate token breakdown inline
    const totalModelTokens = models.reduce((sum, model) => sum + model.totalTokens, 0);
    const tokenBreakdown = {
      totalTokens: totalModelTokens,
      breakdown: models.map((model) => ({
        model: model.model,
        tokens: model.totalTokens,
        percentage: totalModelTokens > 0 ? `${((model.totalTokens / totalModelTokens) * 100).toFixed(1)}%` : "0%",
      })),
    };

    // Calculate daily vs total comparison
    const dailyCostPercentage =
      dailyUsage && totalUsage.cost > 0 ? `${((dailyUsage.cost / totalUsage.cost) * 100).toFixed(1)}%` : "0%";

    // Estimate monthly cost based on daily average
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    const todayDayOfMonth = new Date().getDate();
    const dailyAverage = totalUsage.cost / Math.max(todayDayOfMonth, 1);
    const projectedMonthlyCost = dailyAverage * daysInMonth;

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label title="Cost Overview" text={formatCost(totalUsage.cost)} icon={Icon.Coins} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Daily vs Total" />
        <List.Item.Detail.Metadata.Label
          title="Today's Cost"
          text={dailyUsage ? formatCost(dailyUsage.cost) : "$0.00"}
        />
        <List.Item.Detail.Metadata.Label title="Today's % of Total" text={dailyCostPercentage} />
        <List.Item.Detail.Metadata.Label title="Total Cost" text={formatCost(totalUsage.cost)} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Cost Efficiency" />
        <List.Item.Detail.Metadata.Label
          title="Cost per MTok"
          text={getCostPerMTok(totalUsage.cost, totalUsage.totalTokens)}
        />
        <List.Item.Detail.Metadata.Label
          title="Cost per Input MTok"
          text={getCostPerMTok(totalUsage.cost, totalUsage.inputTokens)}
        />
        <List.Item.Detail.Metadata.Label
          title="Cost per Output MTok"
          text={getCostPerMTok(totalUsage.cost, totalUsage.outputTokens)}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Projections" />
        <List.Item.Detail.Metadata.Label title="Daily Average" text={formatCost(dailyAverage)} />
        <List.Item.Detail.Metadata.Label
          title="Projected Monthly"
          text={formatCost(projectedMonthlyCost)}
          icon={projectedMonthlyCost > 100 ? { source: Icon.ExclamationMark, tintColor: Color.Red } : undefined}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Cost by Model" />
        {costBreakdown.breakdown.slice(0, 5).map((model, index) => (
          <List.Item.Detail.Metadata.Label
            key={`cost-${model.model || "unknown"}-${index}`}
            title={model.model || "Unknown Model"}
            text={`${formatCost(model.cost)} (${model.percentage})`}
            icon={Icon.Star}
          />
        ))}

        {tokenBreakdown.breakdown.length > 0 && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Token Distribution" />
            {tokenBreakdown.breakdown.slice(0, 3).map((model, index) => (
              <List.Item.Detail.Metadata.Label
                key={`token-${model.model || "unknown"}-${index}`}
                title={model.model || "Unknown Model"}
                text={`${formatTokens(model.tokens)} (${model.percentage})`}
                icon={Icon.Text}
              />
            ))}
          </>
        )}
      </List.Item.Detail.Metadata>
    );
  };

  const getAccessories = (): List.Item.Accessory[] => {
    if (error) {
      return [{ text: "Setup required", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } }];
    }

    if (!totalUsage) {
      return [{ text: "No cost data", icon: Icon.Circle }];
    }

    return [{ text: formatCost(totalUsage.cost), icon: Icon.Coins }];
  };

  return (
    <List.Item
      id="cost-analysis"
      title="Costs"
      icon={Icon.Coins}
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
          <Action.OpenInBrowser title="Claude Pricing" url="https://www.anthropic.com/pricing" icon={Icon.Coins} />
          <Action.OpenInBrowser
            title="Usage Guidelines"
            url="https://docs.anthropic.com/claude/docs/usage-guidelines"
            icon={Icon.Book}
          />
        </ActionPanel>
      }
    />
  );
}
