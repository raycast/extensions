import { formatDuration } from "./duration";
import {
  planForDate,
  isPlanComplete,
  isPlanDate,
  latestPlanDateBefore,
  localDateKey,
  planDates,
  planDurationSeconds,
} from "./planning";
import type { ActiveTimer, SavedPlan, Project, WorkLog } from "./types";

export type PlanData = {
  goals: SavedPlan[];
  dayGoals?: SavedPlan[];
  projects: Project[];
  logs: WorkLog[];
  timer: ActiveTimer | null;
};

export function createDailyPlan(data: PlanData, date: string, now = new Date()) {
  if (!isPlanDate(date)) throw new Error("Select a valid plan date");
  const goals =
    data.dayGoals ??
    data.goals.flatMap((goal) => {
      const visible = planForDate(goal, date);
      return visible ? [visible] : [];
    });
  const sourceGoals = new Map(data.goals.map((goal) => [goal.id, goal]));
  return {
    date,
    today: localDateKey(now),
    previousPlanDate: latestPlanDateBefore(data.goals, localDateKey(now)),
    dates: [...new Set([date, localDateKey(now), ...data.goals.flatMap(planDates)])].sort().reverse(),
    projects: data.projects,
    goals: goals.map((goal) => ({
      ...goal,
      sharedAcrossDates:
        new Set(
          (sourceGoals.get(goal.id) ?? goal).tasks.map((task) => task.date ?? (sourceGoals.get(goal.id) ?? goal).date),
        ).size > 1,
      complete: isPlanComplete(goal),
      projectName: data.projects.find((project) => project.id === goal.projectId)?.name ?? "Unknown Project",
      seconds: planDurationSeconds(date, data.logs, data.timer, now, { goalId: goal.id }),
      tasks: goal.tasks.map((task) => ({
        ...task,
        seconds: planDurationSeconds(date, data.logs, data.timer, now, { goalId: goal.id, taskId: task.id }),
      })),
    })),
    totalSeconds: planDurationSeconds(date, data.logs, data.timer, now),
    active: data.timer,
  };
}
export type DailyPlan = ReturnType<typeof createDailyPlan>;
export type PlanItem = DailyPlan["goals"][number];

export function planItemId(reference: { goalId: string; taskId?: string }): string {
  return JSON.stringify([reference.goalId, reference.taskId ?? null]);
}

export function planDateLabel(date: string): string {
  return new Date(`${date}T12:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", weekday: "long" });
}

// Only publish a clock tick when a visible duration or the local day changes.
export function planClockKey(data: PlanData, date: string, now: Date): string {
  const plan = createDailyPlan(data, date, now);
  const displayTime = (seconds: number) => (seconds > 0 ? formatDuration(seconds) : "—");
  return JSON.stringify([
    plan.today,
    displayTime(plan.totalSeconds),
    ...plan.goals.flatMap((goal) => [
      displayTime(goal.seconds),
      ...goal.tasks.map((task) => displayTime(task.seconds)),
    ]),
  ]);
}
