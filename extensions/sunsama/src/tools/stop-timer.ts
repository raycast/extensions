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
  let taskId = input.taskId?.trim();
  let subtaskId: string | undefined;

  // Whatever is running is the thing to stop — including a subtask timer.
  const active = await getActiveTimer();
  if (active && (!taskId || active.taskId === taskId)) {
    taskId = active.taskId;
    subtaskId = active.subtaskId;
  }
  if (!taskId) return { stopped: false, reason: "No timer is running." };

  await stopTimer(taskId, subtaskId);
  return { stopped: true };
}
