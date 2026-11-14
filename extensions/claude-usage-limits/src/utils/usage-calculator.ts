import { SessionData, ModelUsage } from "../types/usage-types";
import { orderBy, sumBy, groupBy, minBy, meanBy } from "es-toolkit";

export const getTopModels = (models: ModelUsage[], limit: number = 5): ModelUsage[] => {
  return orderBy(models, ["totalTokens"], ["desc"]).slice(0, limit);
};

export const getRecentSessions = (sessions: SessionData[], limit: number = 10): SessionData[] => {
  return orderBy(
    sessions,
    [(session) => (session.lastActivity ? new Date(session.lastActivity).getTime() : 0)],
    ["desc"],
  ).slice(0, limit);
};

export const calculateAverageSessionCost = (sessions: SessionData[]): number => {
  if (sessions.length === 0) return 0;
  return meanBy(sessions, (session) => session.totalCost);
};

export const calculateAverageSessionTokens = (sessions: SessionData[]): number => {
  if (sessions.length === 0) return 0;
  return meanBy(sessions, (session) => session.totalTokens);
};

export const calculateModelUsage = (sessions: SessionData[]): ModelUsage[] => {
  const entries = sessions.flatMap((session, sessionIndex) =>
    session.modelBreakdowns?.length
      ? session.modelBreakdowns.map((breakdown) => ({
          sessionIndex,
          model: breakdown.modelName,
          inputTokens: breakdown.inputTokens || 0,
          outputTokens: breakdown.outputTokens || 0,
          totalTokens:
            (breakdown.inputTokens || 0) +
            (breakdown.outputTokens || 0) +
            (breakdown.cacheCreationTokens || 0) +
            (breakdown.cacheReadTokens || 0),
          cost: breakdown.cost || 0,
        }))
      : [
          {
            sessionIndex,
            model: session.modelsUsed?.[0] || "unknown",
            inputTokens: session.inputTokens || 0,
            outputTokens: session.outputTokens || 0,
            totalTokens: session.totalTokens || 0,
            cost: session.totalCost || 0,
          },
        ],
  );

  const modelUsages = Object.entries(groupBy(entries, (entry) => entry.model)).map(([model, modelEntries]) => ({
    model,
    inputTokens: sumBy(modelEntries, (entry) => entry.inputTokens),
    outputTokens: sumBy(modelEntries, (entry) => entry.outputTokens),
    totalTokens: sumBy(modelEntries, (entry) => entry.totalTokens),
    totalCost: sumBy(modelEntries, (entry) => entry.cost),
    sessionCount: new Set(modelEntries.map((entry) => entry.sessionIndex)).size,
  }));

  return orderBy(modelUsages, ["totalTokens"], ["desc"]);
};

export const calculateEfficiencyMetrics = (
  sessions: SessionData[],
): {
  averageInputOutputRatio: number;
  averageCostPerOutput: number;
  mostEfficientModel: string | null;
} => {
  if (sessions.length === 0) {
    return {
      averageInputOutputRatio: 0,
      averageCostPerOutput: 0,
      mostEfficientModel: null,
    };
  }

  const totalInputTokens = sumBy(sessions, (s) => s.inputTokens);
  const totalOutputTokens = sumBy(sessions, (s) => s.outputTokens);
  const totalCost = sumBy(sessions, (s) => s.totalCost);

  const averageInputOutputRatio = totalInputTokens > 0 ? totalOutputTokens / totalInputTokens : 0;
  const averageCostPerOutput = totalOutputTokens > 0 ? totalCost / totalOutputTokens : 0;

  const modelEfficiencies = calculateModelUsage(sessions)
    .filter((model) => model.outputTokens > 0)
    .map((model) => ({ model: model.model, efficiency: model.totalCost / model.outputTokens }));

  const mostEfficientModel =
    modelEfficiencies.length > 0 ? minBy(modelEfficiencies, ({ efficiency }) => efficiency)?.model || null : null;

  return {
    averageInputOutputRatio,
    averageCostPerOutput,
    mostEfficientModel,
  };
};

export const calculateCostBreakdown = (models: ModelUsage[]) => {
  const totalModelCost = models.reduce((sum, model) => sum + model.totalCost, 0);

  return {
    totalCost: totalModelCost,
    breakdown: models.map((model) => ({
      model: model.model,
      totalCost: model.totalCost,
      percentage: totalModelCost > 0 ? `${((model.totalCost / totalModelCost) * 100).toFixed(1)}%` : "0%",
    })),
  };
};

export const calculateTokenBreakdown = (models: ModelUsage[]) => {
  const totalModelTokens = models.reduce((sum, model) => sum + model.totalTokens, 0);

  return {
    totalTokens: totalModelTokens,
    breakdown: models.map((model) => ({
      model: model.model,
      tokens: model.totalTokens,
      percentage: totalModelTokens > 0 ? `${((model.totalTokens / totalModelTokens) * 100).toFixed(1)}%` : "0%",
    })),
  };
};

export const calculateDailyCostPercentage = (dailyCost: number, totalCost: number): string => {
  return totalCost > 0 ? `${((dailyCost / totalCost) * 100).toFixed(1)}%` : "0%";
};

export const calculateMonthlyProjection = (
  monthlyCost: number,
): { dailyAverage: number; projectedMonthlyCost: number } => {
  const now = new Date();
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dailyAverage = monthlyCost / Math.max(dayOfMonth, 1);
  const projectedMonthlyCost = dailyAverage * daysInMonth;

  return {
    dailyAverage,
    projectedMonthlyCost,
  };
};

export const calculateModelAggregates = (models: ModelUsage[]) => {
  return {
    totalTokens: models.reduce((sum, model) => sum + model.totalTokens, 0),
    totalCost: models.reduce((sum, model) => sum + model.totalCost, 0),
  };
};

export const findMostEfficientModel = (models: ModelUsage[]): ModelUsage | null => {
  if (models.length === 0) return null;

  return models.reduce((best, current) => {
    const currentEfficiency = current.totalTokens > 0 ? current.totalCost / current.totalTokens : Infinity;
    const bestEfficiency = best && best.totalTokens > 0 ? best.totalCost / best.totalTokens : Infinity;
    return currentEfficiency < bestEfficiency ? current : best;
  }, models[0] || null);
};

export const calculateModelPercentage = (modelTokens: number, totalTokens: number): string => {
  return totalTokens > 0 ? `${((modelTokens / totalTokens) * 100).toFixed(1)}%` : "0%";
};
