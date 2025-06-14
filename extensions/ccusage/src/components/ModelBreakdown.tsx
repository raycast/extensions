import React, { ReactNode } from "react";
import { List, Icon, ActionPanel, Action, Color, openExtensionPreferences } from "@raycast/api";
import { ModelUsage } from "../types/usage-types";
import { formatTokens, formatCost, getCostPerMTok, copyToClipboard, getCcusageCommand } from "../utils/data-formatter";
import { getTopModels } from "../utils/usage-calculator";
import { groupModelsByTier } from "../utils/model-utils";

type ModelBreakdownProps = {
  models: ModelUsage[];
  isLoading: boolean;
  error?: string;
  settingsActions?: ReactNode;
};

export function ModelBreakdown({ models, isLoading, error, settingsActions }: ModelBreakdownProps) {
  const getDetailMetadata = (): ReactNode => {
    if (error) {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Error" text="ccusage is not available" icon={Icon.ExclamationMark} />
          <List.Item.Detail.Metadata.Label title="Solution" text="Please configure JavaScript runtime in Preferences" />
        </List.Item.Detail.Metadata>
      );
    }

    if (!models || models.length === 0) {
      return (
        <List.Item.Detail.Metadata>
          <List.Item.Detail.Metadata.Label title="Status" text="No model usage data available" icon={Icon.Circle} />
          <List.Item.Detail.Metadata.Separator />
          <List.Item.Detail.Metadata.Label
            title="Note"
            text="Model breakdown will appear after using different Claude models"
          />
        </List.Item.Detail.Metadata>
      );
    }

    const topModels = getTopModels(models, 10);

    // Calculate totals inline
    const totalTokens = models.reduce((sum, model) => sum + model.totalTokens, 0);
    const totalCost = models.reduce((sum, model) => sum + model.cost, 0);
    const totalSessions = models.reduce((sum, model) => sum + model.sessionCount, 0);

    // Find most efficient model (lowest cost per token)
    const mostEfficientModel = models.reduce((best, current) => {
      const currentEfficiency = current.totalTokens > 0 ? current.cost / current.totalTokens : Infinity;
      const bestEfficiency = best && best.totalTokens > 0 ? best.cost / best.totalTokens : Infinity;
      return currentEfficiency < bestEfficiency ? current : best;
    }, models[0] || null);

    // Group models by tier
    const modelsByTier = groupModelsByTier(models);

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Model Overview"
          text={`${models.length} models used`}
          icon={Icon.BarChart}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Usage Distribution" />
        <List.Item.Detail.Metadata.Label title="Total Tokens" text={formatTokens(totalTokens)} />
        <List.Item.Detail.Metadata.Label title="Total Cost" text={formatCost(totalCost)} />
        <List.Item.Detail.Metadata.Label title="Total Sessions" text={totalSessions.toString()} />
        <List.Item.Detail.Metadata.Separator />

        {mostEfficientModel && (
          <>
            <List.Item.Detail.Metadata.Label title="Efficiency Analysis" />
            <List.Item.Detail.Metadata.Label
              title="Most Efficient Model"
              text={mostEfficientModel.model || "Unknown Model"}
              icon={Icon.Star}
            />
            <List.Item.Detail.Metadata.Label
              title="Cost per MTok"
              text={getCostPerMTok(mostEfficientModel.cost, mostEfficientModel.totalTokens)}
            />
            <List.Item.Detail.Metadata.Separator />
          </>
        )}

        {Object.entries(modelsByTier).map(
          ([tier, tierModels]) =>
            tierModels.length > 0 && (
              <React.Fragment key={tier}>
                <List.Item.Detail.Metadata.Label title={`${tier} Models`} />
                {tierModels.slice(0, 3).map((model, index) => {
                  const percentage =
                    totalTokens > 0 ? `${((model.totalTokens / totalTokens) * 100).toFixed(1)}%` : "0%";

                  return (
                    <List.Item.Detail.Metadata.Label
                      key={`${tier}-${model.model || "unknown"}-${index}`}
                      title={model.model || "Unknown Model"}
                      text={`${formatTokens(model.totalTokens)} (${percentage}) • ${formatCost(model.cost)} • ${model.sessionCount} sessions`}
                      icon={Icon.Star}
                    />
                  );
                })}
                <List.Item.Detail.Metadata.Separator />
              </React.Fragment>
            ),
        )}

        <List.Item.Detail.Metadata.Label title="Top Models by Usage" />
        {topModels.slice(0, 5).map((model, index) => {
          const costPerMTok = getCostPerMTok(model.cost, model.totalTokens);

          return (
            <List.Item.Detail.Metadata.Label
              key={`top-${model.model || "unknown"}-${index}`}
              title={`${index + 1}. ${model.model || "Unknown Model"}`}
              text={`${formatTokens(model.totalTokens)} • ${formatCost(model.cost)} • ${costPerMTok}`}
              icon={Icon.Star}
            />
          );
        })}
      </List.Item.Detail.Metadata>
    );
  };

  const getAccessories = (): List.Item.Accessory[] => {
    if (error) {
      return [{ text: "Setup required", icon: { source: Icon.ExclamationMark, tintColor: Color.Red } }];
    }

    if (!models || models.length === 0) {
      return [{ text: "No models", icon: Icon.Circle }];
    }

    return [{ text: `${models.length} models`, icon: Icon.BarChart }];
  };

  return (
    <List.Item
      id="model-breakdown"
      title="Models"
      icon={Icon.BarChart}
      accessories={getAccessories()}
      detail={<List.Item.Detail isLoading={isLoading} metadata={getDetailMetadata()} />}
      actions={
        <ActionPanel>
          <Action
            title="Copy Ccusage Command"
            icon={Icon.Clipboard}
            onAction={() => copyToClipboard(getCcusageCommand(), "Copied ccusage command to clipboard")}
          />
          <Action
            title="Open Preferences"
            icon={Icon.Gear}
            onAction={openExtensionPreferences}
          />
          {settingsActions}
          <ActionPanel.Section>
            <Action.OpenInBrowser
              title="Claude Model Comparison"
              url="https://docs.anthropic.com/claude/docs/models-overview"
              icon={Icon.Book}
            />
            <Action.OpenInBrowser title="Claude Pricing" url="https://www.anthropic.com/pricing" icon={Icon.Coins} />
          </ActionPanel.Section>
        </ActionPanel>
      }
    />
  );
}
