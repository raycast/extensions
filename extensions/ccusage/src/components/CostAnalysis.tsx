import { List, Icon } from "@raycast/api";
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
  const { data: totalUsage, monthlyCost, isLoading: totalLoading, error: totalError } = useTotalUsage();
  const { data: dailyUsage, isLoading: dailyLoading, error: dailyError } = useDailyUsage();
  const { topModels: models, isLoading: modelsLoading, error: modelsError } = useSessionUsage();

  const isLoading = totalLoading || dailyLoading || modelsLoading;

  const costBreakdown = useMemo(() => (models ? calculateCostBreakdown(models) : { breakdown: [] }), [models]);
  const tokenBreakdown = useMemo(() => (models ? calculateTokenBreakdown(models) : { breakdown: [] }), [models]);

  const dailyCostPercentage = useMemo(
    () => (dailyUsage && totalUsage ? calculateDailyCostPercentage(dailyUsage.totalCost, totalUsage.totalCost) : "0%"),
    [dailyUsage?.totalCost, totalUsage?.totalCost],
  );

  const { dailyAverage, projectedMonthlyCost } = useMemo(
    () => (monthlyCost > 0 ? calculateMonthlyProjection(monthlyCost) : { dailyAverage: 0, projectedMonthlyCost: 0 }),
    [monthlyCost],
  );

  const accessories: List.Item.Accessory[] =
    totalError && !totalUsage
      ? STANDARD_ACCESSORIES.ERROR
      : totalUsage === undefined
        ? totalLoading
          ? STANDARD_ACCESSORIES.LOADING
          : STANDARD_ACCESSORIES.NO_DATA
        : !totalUsage
          ? STANDARD_ACCESSORIES.NO_DATA
          : [{ text: formatCost(totalUsage.totalCost), icon: Icon.Coins }];
  const renderDetailMetadata = (): ReactNode => {
    const errorMetadata = ErrorMetadata({
      error: !totalUsage ? totalError : undefined,
      isLoading: totalLoading,
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
        {totalError && <List.Item.Detail.Metadata.Label title="Refresh Error" text={totalError.message} />}
        <List.Item.Detail.Metadata.Label
          title="Cost Overview"
          text={formatCost(totalUsage.totalCost)}
          icon={Icon.Coins}
        />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Daily vs Total" />
        <List.Item.Detail.Metadata.Label
          title="Today's Cost"
          text={dailyUsage ? formatCost(dailyUsage.totalCost) : dailyLoading ? "Loading…" : "No data"}
        />
        {dailyUsage && <List.Item.Detail.Metadata.Label title="Today's % of Total" text={dailyCostPercentage} />}
        {dailyError && <List.Item.Detail.Metadata.Label title="Daily Usage Error" text={dailyError.message} />}
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
        <List.Item.Detail.Metadata.Label title="Projected Monthly" text={formatCost(projectedMonthlyCost)} />
        <List.Item.Detail.Metadata.Separator />

        <List.Item.Detail.Metadata.Label title="Cost by Model" />
        {modelsError && <List.Item.Detail.Metadata.Label title="Model Usage Error" text={modelsError.message} />}
        {models.length === 0 && (
          <List.Item.Detail.Metadata.Label
            title="Status"
            text={
              modelsLoading ? "Loading model details…" : modelsError ? "Model details unavailable" : "No model data"
            }
          />
        )}
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
