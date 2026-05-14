import React, { ReactNode, useMemo } from "react";
import { List, Icon } from "@raycast/api";
import { formatTokens, formatCost, getCostPerMTok } from "../utils/data-formatter";
import {
  getTopModels,
  calculateModelAggregates,
  findMostEfficientModel,
  calculateModelPercentage,
} from "../utils/usage-calculator";
import { groupModelsByTier } from "../utils/model-utils";
import { useSessionUsage } from "../hooks/useSessionUsage";
import { ErrorMetadata } from "./ErrorMetadata";
import { StandardActions, type ExternalLink } from "./common/StandardActions";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { MESSAGES } from "../utils/messages";

const externalLinks: ExternalLink[] = [
  { title: "Claude Model Comparison", url: "https://docs.anthropic.com/claude/docs/models-overview", icon: Icon.Book },
  { title: "Claude Pricing", url: "https://www.anthropic.com/pricing", icon: Icon.Coins },
];

export function ModelBreakdown() {
  const { topModels: models, isLoading, error } = useSessionUsage();

  const topModelsList = useMemo(() => (models ? getTopModels(models, 10) : []), [models]);

  const { totalTokens, totalCost, totalSessions } = useMemo(
    () => (models ? calculateModelAggregates(models) : { totalTokens: 0, totalCost: 0, totalSessions: 0 }),
    [models],
  );

  const mostEfficientModel = useMemo(() => (models ? findMostEfficientModel(models) : null), [models]);

  const modelsByTier = useMemo(() => (models ? groupModelsByTier(models) : {}), [models]);

  const accessories: List.Item.Accessory[] = error
    ? STANDARD_ACCESSORIES.ERROR
    : models.length === 0 && isLoading
      ? STANDARD_ACCESSORIES.LOADING
      : !models || models.length === 0
        ? [{ text: "No models", icon: Icon.Circle }]
        : [{ text: `${models.length} models`, icon: Icon.BarChart }];
  const renderDetailMetadata = (): ReactNode => {
    const errorMetadata = ErrorMetadata({
      error,
      noDataMessage: !models || models.length === 0 ? "No model usage data available" : undefined,
      noDataSubMessage:
        !models || models.length === 0 ? `Model breakdown will appear ${MESSAGES.DIFFERENT_MODELS}` : undefined,
    });

    if (errorMetadata) {
      return errorMetadata;
    }

    if (!models || models.length === 0) {
      return null;
    }

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
              text={getCostPerMTok(mostEfficientModel.totalCost, mostEfficientModel.totalTokens)}
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
                  const percentage = calculateModelPercentage(model.totalTokens, totalTokens);

                  return (
                    <List.Item.Detail.Metadata.Label
                      key={`${tier}-${model.model || "unknown"}-${index}`}
                      title={model.model || "Unknown Model"}
                      text={`${formatTokens(model.totalTokens)} (${percentage}) • ${formatCost(model.totalCost)} • ${model.sessionCount} sessions`}
                      icon={Icon.Star}
                    />
                  );
                })}
                <List.Item.Detail.Metadata.Separator />
              </React.Fragment>
            ),
        )}

        <List.Item.Detail.Metadata.Label title="Top Models by Usage" />
        {topModelsList.slice(0, 5).map((model, index) => {
          const costPerMTok = getCostPerMTok(model.totalCost, model.totalTokens);

          return (
            <List.Item.Detail.Metadata.Label
              key={`top-${model.model || "unknown"}-${index}`}
              title={`${index + 1}. ${model.model || "Unknown Model"}`}
              text={`${formatTokens(model.totalTokens)} • ${formatCost(model.totalCost)} • ${costPerMTok}`}
              icon={Icon.Star}
            />
          );
        })}
      </List.Item.Detail.Metadata>
    );
  };

  return (
    <List.Item
      id="model-breakdown"
      title="Models"
      icon={Icon.BarChart}
      accessories={accessories}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={<StandardActions externalLinks={externalLinks} />}
    />
  );
}
