import { getDateRange, getOverlapDurationSeconds } from "./date";
import type { ActiveTimer, Project, ReportPeriod, WorkLog } from "./types";

export type ProjectTotal = {
  projectId: string;
  projectName: string;
  type: string;
  seconds: number;
};

export type Report = {
  totalSeconds: number;
  clientSeconds: number;
  internalSeconds: number;
  unknownSeconds: number;
  categorySeconds: Record<string, number>;
  projects: ProjectTotal[];
};

export function createReport(
  period: ReportPeriod,
  workLogs: WorkLog[],
  projects: Project[],
  activeTimer: ActiveTimer | null,
  now: Date = new Date(),
): Report {
  const { start, end } = getDateRange(period, now);
  const totals = new Map<string, ProjectTotal>();

  for (const workLog of workLogs) {
    const seconds = getOverlapDurationSeconds(workLog.startedAt, workLog.endedAt, start, end);
    addProjectDuration(totals, projects, workLog.projectId, seconds);
  }

  if (activeTimer) {
    try {
      const seconds = getOverlapDurationSeconds(activeTimer.startedAt, now, start, end);
      addProjectDuration(totals, projects, activeTimer.projectId, seconds);
    } catch (error) {
      // A system clock change can make an otherwise valid active timer appear to
      // start in the future. Keep completed work visible instead of crashing.
      console.error("Could not include the active timer in the report", error);
    }
  }

  const projectTotals = [...totals.values()].filter((item) => item.seconds > 0).sort((a, b) => b.seconds - a.seconds);
  const clientSeconds = sumByType(projectTotals, "client");
  const internalSeconds = sumByType(projectTotals, "internal");
  const unknownSeconds = sumByType(projectTotals, "unknown");
  const categorySeconds = Object.fromEntries(
    projectTotals
      .filter((item) => item.type !== "unknown")
      .map((item) => item.type)
      .filter((value, index, values) => values.indexOf(value) === index)
      .map((type) => [type, sumByType(projectTotals, type)]),
  );

  return {
    totalSeconds: projectTotals.reduce((sum, item) => sum + item.seconds, 0),
    clientSeconds,
    internalSeconds,
    unknownSeconds,
    categorySeconds,
    projects: projectTotals,
  };
}

function addProjectDuration(
  totals: Map<string, ProjectTotal>,
  projects: Project[],
  projectId: string,
  seconds: number,
): void {
  if (seconds <= 0) return;

  const project = projects.find((item) => item.id === projectId);
  const existing = totals.get(projectId);
  if (existing) {
    existing.seconds += seconds;
    return;
  }

  totals.set(projectId, {
    projectId,
    projectName: project?.name ?? "Unknown Project",
    type: project?.type ?? "unknown",
    seconds,
  });
}

function sumByType(projectTotals: ProjectTotal[], type: ProjectTotal["type"]): number {
  return projectTotals.filter((item) => item.type === type).reduce((sum, item) => sum + item.seconds, 0);
}
