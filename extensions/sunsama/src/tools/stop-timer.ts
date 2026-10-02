import { getActiveTimer, stopTimer } from "../lib/sunsama-client";

type Input = {
  /**
   * The task id, from get-tasks. Leave empty to stop whatever timer is
   * running right now.
   */
  taskId?: string;
};

/** Stop the running timer. */
export default async function tool(input: Input) {
  const taskId = input.taskId?.trim();

  // Sunsama runs one timer at a time, so the active one is the only thing
  // that can be stopped — including when it's on a subtask.
  const active = await getActiveTimer();
  const running = active?.taskId;
  if (!running) return { stopped: false, reason: "No timer is running." };
  if (taskId && running !== taskId) {
    return {
      stopped: false,
      reason: "The running timer is on a different task.",
      runningTaskId: running,
    };
  }

  await stopTimer(running, active.subtaskId);
  return { stopped: true, taskId: running };
}
