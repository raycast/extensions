import { Tool } from "@raycast/api";
import {
  formatDurationHuman,
  getTimerDuration,
  getTimerStatus,
  stopTimer,
} from "../api";

type Input = {
  /**
   * Optional time the timer should stop at, in the user's local time with its UTC offset, as ISO 8601
   * (for example "2026-09-11T17:30:00+02:00"). Defaults to now.
   */
  endDateTime?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const timer = await getTimerStatus();
  if (timer.status === "stopped") {
    return undefined;
  }

  return {
    message: `Stop tracking ${timer.task?.project?.title ?? "the current project"}?`,
    info: [
      { name: "Project", value: timer.task?.project?.title },
      {
        name: "Tracked so far",
        value: formatDurationHuman(getTimerDuration(timer)),
      },
      { name: "Stop time", value: input.endDateTime },
    ],
  };
};

export default async function tool(input: Input) {
  const before = await getTimerStatus();
  if (before.status === "stopped") {
    throw new Error("No timer is running, so there is nothing to stop.");
  }

  const timer = await stopTimer(input.endDateTime);
  const task = timer.task;

  return {
    status: timer.status,
    project: task?.project?.title,
    startedAt: task?.startDateTime,
    endedAt: task?.endDateTime,
    // task.duration comes back in seconds once the task is closed
    durationMinutes: task?.duration
      ? Math.round(task.duration / 60)
      : undefined,
  };
}
