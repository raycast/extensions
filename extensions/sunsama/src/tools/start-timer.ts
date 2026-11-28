import { startTimer } from "../lib/sunsama-client";

type Input = {
  /** The task id, from get-tasks. */
  taskId: string;
  /** A subtask id, from get-tasks, to time that subtask instead of the task. */
  subtaskId?: string;
};

/**
 * Start the timer on a task or one of its subtasks. Sunsama runs one timer at
 * a time, so this stops whatever else was running.
 */
export default async function tool(input: Input) {
  await startTimer(input.taskId, input.subtaskId);
  return { running: true };
}
