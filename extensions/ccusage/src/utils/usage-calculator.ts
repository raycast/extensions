import { SessionData, ModelUsage } from "../types/usage-types";
import { orderBy, sumBy, groupBy, minBy, meanBy } from "es-toolkit";

export const getTopModels = (models: ModelUsage[], limit: number = 5): ModelUsage[] => {
  return orderBy(models, ["totalTokens"], ["desc"]).slice(0, limit);
};

export const getRecentSessions = (sessions: SessionData[], limit: number = 10): SessionData[] => {
  return orderBy(sessions, [(session) => new Date(session.lastActivity).getTime()], ["desc"]).slice(0, limit);
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
  const sessionsByModel = groupBy(
    sessions,
    (session) => session.modelBreakdowns?.[0]?.modelName || session.modelsUsed?.[0] || "unknown",
  );

  const modelUsages = Object.entries(sessionsByModel).map(([model, modelSessions]) => ({
    model,
    inputTokens: sumBy(modelSessions, (session) => session.inputTokens || 0),
    outputTokens: sumBy(modelSessions, (session) => session.outputTokens || 0),
    totalTokens: sumBy(modelSessions, (session) => session.totalTokens || 0),
    totalCost: sumBy(modelSessions, (session) => session.totalCost || 0),
    sessionCount: modelSessions.length,
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

  const sessionsByModel = groupBy(
    sessions,
    (session) => session.modelBreakdowns?.[0]?.modelName || session.modelsUsed?.[0] || "unknown",
  );

  const modelEfficiencies = Object.entries(sessionsByModel)
    .map(([model, modelSessions]) => {
      const totalModelCost = sumBy(modelSessions, (s) => s.totalCost);
      const totalModelOutput = sumBy(modelSessions, (s) => s.outputTokens);

      return {
        model,
        efficiency: totalModelOutput > 0 ? totalModelCost / totalModelOutput : Infinity,
      };
    })
    .filter(({ efficiency }) => efficiency !== Infinity);

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
  totalCost: number,
): { dailyAverage: number; projectedMonthlyCost: number } => {
  const now = new Date();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const todayDayOfMonth = now.getDate();
  const dailyAverage = totalCost / Math.max(todayDayOfMonth, 1);
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
    totalSessions: models.reduce((sum, model) => sum + model.sessionCount, 0),
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
