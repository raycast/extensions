import {
  getTaskDurationMs,
  getTimerDuration,
  getTimerStatus,
  getTodayTasks,
} from "../api";

/**
 * Prefer this over `list-tasks` when the question is about right now or about
 * today's total. It answers both from a single call.
 */
export default async function tool() {
  const [timer, today] = await Promise.all([getTimerStatus(), getTodayTasks()]);

  const trackedTodayMs = today.reduce(
    (sum, task) => sum + getTaskDurationMs(task),
    0,
  );

  return {
    status: timer.status,
    project: timer.task?.project?.title,
    projectId: timer.task?.project?.id,
    description: timer.task?.description,
    startedAt: timer.task?.startDateTime,
    currentDurationMinutes: Math.round(getTimerDuration(timer) / 60000),
    trackedTodayMinutes: Math.round(trackedTodayMs / 60000),
    tasksToday: today.length,
  };
}
