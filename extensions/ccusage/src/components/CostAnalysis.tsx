import { List, Icon, Color } from "@raycast/api";
import { ReactNode, useMemo } from "react";
import { formatTokens, formatCost, getCostPerMTok } from "../utils/data-formatter";
import {
  calculateCostBreakdown,
  calculateTokenBreakdown,
  calculateDailyCostPercentage,
  calculateMonthlyProjection,
} from "../utils/usage-calculator";
import { useTotalUsage } from "../hooks/useTotalUsage";
import { useDailyUsage } from "../hooks/useDailyUsage";
import { useSessionUsage } from "../hooks/useSessionUsage";
import { ErrorMetadata } from "./ErrorMetadata";
import { StandardActions, type ExternalLink } from "./common/StandardActions";
import { STANDARD_ACCESSORIES } from "./common/accessories";
import { MESSAGES } from "../utils/messages";

const externalLinks: ExternalLink[] = [
  { title: "Claude Pricing", url: "https://www.anthropic.com/pricing", icon: Icon.Coins },
  {
    title: "Usage Guidelines",
    url: "https://docs.anthropic.com/en/docs/claude-code/data-usage#data-policies",
    icon: Icon.Book,
  },
];

const MAX_COST_MODELS_DISPLAY = 5;
const MAX_TOKEN_MODELS_DISPLAY = 3;

export function CostAnalysis() {
  const { data: totalUsage, isLoading: totalLoading, error: totalError } = useTotalUsage();
  const { data: dailyUsage, isLoading: dailyLoading, error: dailyError } = useDailyUsage();
  const { topModels: models, isLoading: modelsLoading, error: modelsError } = useSessionUsage();

  const isLoading = totalLoading || dailyLoading || modelsLoading;
  const error = totalError || dailyError || modelsError;

  const costBreakdown = useMemo(() => (models ? calculateCostBreakdown(models) : { breakdown: [] }), [models]);
  const tokenBreakdown = useMemo(() => (models ? calculateTokenBreakdown(models) : { breakdown: [] }), [models]);

  const dailyCostPercentage = useMemo(
    () => (dailyUsage && totalUsage ? calculateDailyCostPercentage(dailyUsage.totalCost, totalUsage.totalCost) : "0%"),
    [dailyUsage?.totalCost, totalUsage?.totalCost],
  );

  const { dailyAverage, projectedMonthlyCost } = useMemo(
    () =>
      totalUsage ? calculateMonthlyProjection(totalUsage.totalCost) : { dailyAverage: 0, projectedMonthlyCost: 0 },
    [totalUsage?.totalCost],
  );

  const accessories: List.Item.Accessory[] = error
    ? STANDARD_ACCESSORIES.ERROR
    : totalUsage === undefined
      ? STANDARD_ACCESSORIES.LOADING
      : !totalUsage
        ? STANDARD_ACCESSORIES.NO_DATA
        : [{ text: formatCost(totalUsage.totalCost), icon: Icon.Coins }];
  const renderDetailMetadata = (): ReactNode => {
    const errorMetadata = ErrorMetadata({
      error,
      noDataMessage: !totalUsage ? "No cost data available" : undefined,
      noDataSubMessage: !totalUsage ? `Cost analysis will appear ${MESSAGES.AFTER_USAGE}` : undefined,
    });

    if (errorMetadata) {
      return errorMetadata;
    }

    if (!totalUsage) {
      return null;
    }

    return (
      <List.Item.Detail.Metadata>
        <List.Item.Detail.Metadata.Label
          title="Cost Overview"
          text={formatCost(totalUsage.totalCost)}
          icon={Icon.Coins}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Daily vs Total" />
        <List.Item.Detail.Metadata.Label
          title="Today's Cost"
          text={dailyUsage ? formatCost(dailyUsage.totalCost) : formatCost(0)}
        />
        <List.Item.Detail.Metadata.Label title="Today's % of Total" text={dailyCostPercentage} />
        <List.Item.Detail.Metadata.Label title="Total Cost" text={formatCost(totalUsage.totalCost)} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Cost Efficiency" />
        <List.Item.Detail.Metadata.Label
          title="Cost per MTok"
          text={getCostPerMTok(totalUsage.totalCost, totalUsage.totalTokens)}
        />
        <List.Item.Detail.Metadata.Label
          title="Cost per Input MTok"
          text={getCostPerMTok(totalUsage.totalCost, totalUsage.inputTokens)}
        />
        <List.Item.Detail.Metadata.Label
          title="Cost per Output MTok"
          text={getCostPerMTok(totalUsage.totalCost, totalUsage.outputTokens)}
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
        {costBreakdown.breakdown.slice(0, MAX_COST_MODELS_DISPLAY).map((model, index) => (
          <List.Item.Detail.Metadata.Label
            key={`cost-${model.model || "unknown"}-${index}`}
            title={model.model || "Unknown Model"}
            text={`${formatCost(model.totalCost)} (${model.percentage})`}
            icon={Icon.Star}
          />
        ))}

        {tokenBreakdown.breakdown.length > 0 && (
          <>
            <List.Item.Detail.Metadata.Separator />
            <List.Item.Detail.Metadata.Label title="Token Distribution" />
            {tokenBreakdown.breakdown.slice(0, MAX_TOKEN_MODELS_DISPLAY).map((model, index) => (
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

  return (
    <List.Item
      id="cost-analysis"
      title="Costs"
      icon={Icon.Coins}
      accessories={accessories}
      detail={<List.Item.Detail isLoading={isLoading} metadata={renderDetailMetadata()} />}
      actions={<StandardActions externalLinks={externalLinks} />}
    />
  );
}
