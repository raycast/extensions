import {
  getActiveTimer,
  getTasksForDay,
  withActiveTimer,
} from "../lib/sunsama-client";
import { todayString } from "../lib/date";

type Input = {
  /**
   * The day to list, as YYYY-MM-DD in the user's local timezone. Leave empty
   * for today.
   */
  day?: string;
};

/**
 * List the tasks on a day, in Sunsama's own order.
 *
 * Returns each task's id, title, completion state, planned minutes, tracked
 * minutes, channel, notes (Markdown), linked URL, whether a timer is running,
 * and its subtasks. Call this first to find the id every other tool needs.
 */
export default async function tool(input: Input) {
  const day = input.day?.trim() || todayString();
  const [{ tasks }, timer] = await Promise.all([
    getTasksForDay(day),
    getActiveTimer().catch(() => null),
  ]);

  return {
    day,
    tasks: withActiveTimer(tasks, timer).map((t) => ({
      id: t.id,
      title: t.title,
      completed: t.completed,
      plannedMinutes: t.timeEstimate,
      trackedMinutes: Math.round(t.trackedSeconds / 60),
      channel: t.channelName,
      notes: t.notes,
      url: t.integrationUrl,
      startTime: t.startTime,
      timerRunning: t.isRunning,
      subtasks: t.subtasks.map((s) => ({
        id: s.id,
        title: s.title,
        completed: s.completed,
        plannedMinutes: s.timeEstimate,
        timerRunning: s.isRunning,
      })),
    })),
  };
}
