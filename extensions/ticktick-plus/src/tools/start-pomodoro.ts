import { startPomodoro } from "../lib/pomodoro-engine";
import { formatTimer, getRemainingSeconds } from "../lib/pomodoro-state";
import { loadSyncData } from "./lib/data";

type Input = {
  /** Optional task ID to link the focus session */
  taskId?: string;
  /** Project ID required when taskId is set */
  taskProjectId?: string;
  /** Optional task title for display / TickTick sync */
  taskTitle?: string;
};

/**
 * Start a Pomodoro focus session, optionally linked to a task from search-tasks.
 */
export default async function tool(input: Input) {
  let taskTitle = input.taskTitle;
  if (input.taskId && !taskTitle) {
    const sync = await loadSyncData();
    taskTitle = sync.tasks.find((t) => t.id === input.taskId)?.title;
  }

  const state = await startPomodoro({
    phase: "work",
    taskId: input.taskId,
    taskProjectId: input.taskProjectId,
    taskTitle,
  });

  return {
    phase: state.phase,
    isRunning: state.isRunning,
    remaining: formatTimer(getRemainingSeconds(state)),
    linkedTaskId: state.linkedTaskId,
    linkedTaskTitle: state.linkedTaskTitle,
    ticktickSynced: state.ticktickSynced,
  };
}
