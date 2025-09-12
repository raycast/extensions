import { WorkflowEvent } from "../types";

/**
 * Calculate basic analytics from workflow events
 */
export function calculateBasicAnalytics(events: WorkflowEvent[]) {
  if (events.length === 0) {
    return {
      totalEvents: 0,
      successRate: 0,
      averageExecutionTime: 0,
      errorCount: 0,
    };
  }

  const totalEvents = events.length;
  const successEvents = events.filter((e) => e.status === "success");
  const errorEvents = events.filter((e) => e.status === "error");
  const successRate = (successEvents.length / totalEvents) * 100;
  const averageExecutionTime = events.reduce((sum, e) => sum + e.execution_time_ms, 0) / totalEvents;

  return {
    totalEvents,
    successRate,
    averageExecutionTime,
    errorCount: errorEvents.length,
  };
}

/**
 * Get step performance from events
 */
export function getStepPerformance(events: WorkflowEvent[]) {
  const stepPerformance: Record<string, { avgExecutionTime: number; successRate: number; errorCount: number }> = {};

  // Filter events once and reuse
  const filteredEvents = events.filter((e) => e.status === "success" || e.status === "error");

  filteredEvents.forEach((event) => {
    // For now, we'll use the overall execution time since step-specific data isn't available
    const stepName = "overall";
    if (!stepPerformance[stepName]) {
      stepPerformance[stepName] = {
        avgExecutionTime: 0,
        successRate: 0,
        errorCount: 0,
      };
    }
    stepPerformance[stepName].avgExecutionTime += event.execution_time_ms;
  });

  // Calculate averages
  Object.keys(stepPerformance).forEach((stepName) => {
    if (filteredEvents.length > 0 && stepPerformance[stepName]) {
      const successEvents = filteredEvents.filter((e) => e.status === "success");
      const errorEvents = filteredEvents.filter((e) => e.status === "error");

      stepPerformance[stepName]!.avgExecutionTime /= filteredEvents.length;
      stepPerformance[stepName]!.successRate = (successEvents.length / filteredEvents.length) * 100;
      stepPerformance[stepName]!.errorCount = errorEvents.length;
    }
  });

  return stepPerformance;
}
