import { Tool } from "@raycast/api";
import { getTimerStatus, pauseTimer } from "../api";

export const confirmation: Tool.Confirmation<
  Record<string, never>
> = async () => {
  const timer = await getTimerStatus();
  if (timer.status !== "running") {
    return undefined;
  }

  const project = timer.task?.project?.title ?? "the running project";
  return {
    message: `Pause tracking ${project}?`,
    info: [{ name: "Project", value: timer.task?.project?.title }],
  };
};

export default async function tool() {
  const before = await getTimerStatus();
  if (before.status !== "running") {
    throw new Error(
      before.status === "paused"
        ? "The timer is already paused."
        : "No timer is running, so there is nothing to pause.",
    );
  }

  const timer = await pauseTimer();

  return {
    status: timer.status,
    project: timer.task?.project?.title,
    pausedAt: timer.pause?.startDateTime,
  };
}
