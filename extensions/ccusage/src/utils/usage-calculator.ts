import { SessionData, ModelUsage } from "../types/usage-types";
import { orderBy, sumBy, groupBy, minBy, meanBy } from "es-toolkit";

export const getTopModels = (models: ModelUsage[], limit: number = 5): ModelUsage[] => {
  return orderBy(models, ["totalTokens"], ["desc"]).slice(0, limit);
};

export const getRecentSessions = (sessions: SessionData[], limit: number = 10): SessionData[] => {
  return orderBy(
    sessions,
    [(session) => new Date(session.startTime || session.lastActivity).getTime()],
    ["desc"],
  ).slice(0, limit);
};

export const calculateAverageSessionCost = (sessions: SessionData[]): number => {
  if (sessions.length === 0) return 0;
  return meanBy(sessions, (session) => session.cost);
};

export const calculateAverageSessionTokens = (sessions: SessionData[]): number => {
  if (sessions.length === 0) return 0;
  return meanBy(sessions, (session) => session.totalTokens);
};

export const calculateModelUsage = (sessions: SessionData[]): ModelUsage[] => {
  const sessionsByModel = groupBy(sessions, (session) => session.model || "unknown");

  const modelUsages = Object.entries(sessionsByModel).map(([model, modelSessions]) => ({
    model,
    inputTokens: sumBy(modelSessions, (session) => session.inputTokens || 0),
    outputTokens: sumBy(modelSessions, (session) => session.outputTokens || 0),
    totalTokens: sumBy(modelSessions, (session) => session.totalTokens || 0),
    cost: sumBy(modelSessions, (session) => session.cost || 0),
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
  const totalCost = sumBy(sessions, (s) => s.cost);

  const averageInputOutputRatio = totalInputTokens > 0 ? totalOutputTokens / totalInputTokens : 0;
  const averageCostPerOutput = totalOutputTokens > 0 ? totalCost / totalOutputTokens : 0;

  // Group sessions by model and calculate efficiency
  const sessionsByModel = groupBy(sessions, (session) => session.model || "unknown");

  const modelEfficiencies = Object.entries(sessionsByModel)
    .map(([model, modelSessions]) => {
      const totalModelCost = sumBy(modelSessions, (s) => s.cost);
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
