import { getOverlapDurationSeconds, getStartOfWeek } from "./date";
import { isPlanDate, localDateKey } from "./planning";
import type { PlanData } from "./plan-model";
import type { PlanReference } from "./types";

export type ReviewItem = {
  id: string;
  title: string;
  goalTitle?: string;
  projectName: string;
  seconds: number;
  completedOnDay: boolean;
  running: boolean;
};

export function reviewWeekStart(date: string, offset = 0): string {
  if (!isPlanDate(date)) throw new Error("Select a valid review date");
  const start = getStartOfWeek(new Date(`${date}T12:00:00`));
  start.setDate(start.getDate() + offset * 7);
  return localDateKey(start);
}

// Work belongs to the day it happened; completion belongs to the operation date.
// Neither depends on the plan's current scheduled date.
export function createWeeklyReview(data: PlanData, date: string, now = new Date()) {
  const start = reviewWeekStart(date);
  const goals = new Map(data.goals.map((goal) => [goal.id, goal]));
  const projects = new Map(data.projects.map((project) => [project.id, project.name]));
  const timer = data.timer && !data.logs.some((log) => log.id === data.timer?.id) ? data.timer : null;
  const days = Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${start}T00:00:00`);
    day.setDate(day.getDate() + index);
    const end = new Date(day);
    end.setDate(end.getDate() + 1);
    const key = localDateKey(day);
    const cutoff = new Date(Math.min(end.getTime(), now.getTime()));
    const items = new Map<string, ReviewItem>();
    function item(projectId: string, reference?: PlanReference, description = "") {
      const id = JSON.stringify([projectId, reference?.goalId, reference?.taskId, reference ? null : description]);
      let result = items.get(id);
      if (!result) {
        const goal = reference ? goals.get(reference.goalId) : undefined;
        const task = reference?.taskId ? goal?.tasks.find((task) => task.id === reference.taskId) : undefined;
        result = {
          id,
          title:
            task?.title ??
            (reference && !reference.taskId ? goal?.title : undefined) ??
            (description.trim() || projects.get(projectId) || "Work session"),
          goalTitle: reference?.taskId ? goal?.title : undefined,
          projectName: projects.get(projectId) ?? "Unknown Project",
          seconds: 0,
          completedOnDay: false,
          running: false,
        };
        items.set(id, result);
      }
      return result;
    }
    if (day <= now) {
      for (const log of data.logs) {
        const seconds = getOverlapDurationSeconds(log.startedAt, log.endedAt, day, cutoff);
        if (seconds > 0) item(log.projectId, log.plan, log.description).seconds += seconds;
      }
      if (timer && Date.parse(timer.startedAt) <= now.getTime()) {
        const seconds = getOverlapDurationSeconds(timer.startedAt, now, day, cutoff);
        const running = key === localDateKey(now);
        if (seconds > 0 || running) {
          const row = item(timer.projectId, timer.plan, timer.description);
          row.seconds += seconds;
          row.running = running;
        }
      }
      for (const goal of data.goals) {
        for (const task of goal.tasks.length ? goal.tasks : [undefined]) {
          const completedAt = task ? task.completedAt : goal.completedAt;
          if (completedAt && localDateKey(new Date(completedAt)) === key && Date.parse(completedAt) <= now.getTime()) {
            item(goal.projectId, { goalId: goal.id, ...(task ? { taskId: task.id } : {}) }).completedOnDay = true;
          }
        }
      }
    }
    const rows = [...items.values()].sort(
      (a, b) =>
        (a.goalTitle ?? a.title).localeCompare(b.goalTitle ?? b.title) ||
        a.title.localeCompare(b.title) ||
        a.id.localeCompare(b.id),
    );
    return {
      date: key,
      items: rows,
      seconds: rows.reduce((sum, row) => sum + row.seconds, 0),
      completed: rows.filter((row) => row.completedOnDay).length,
    };
  });
  return {
    start,
    end: days[6].date,
    days,
    seconds: days.reduce((sum, day) => sum + day.seconds, 0),
    completed: days.reduce((sum, day) => sum + day.completed, 0),
  };
}
