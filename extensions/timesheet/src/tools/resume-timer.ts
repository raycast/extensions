import { Tool } from "@raycast/api";
import { getTimerStatus, resumeTimer } from "../api";

export const confirmation: Tool.Confirmation<
  Record<string, never>
> = async () => {
  const timer = await getTimerStatus();
  if (timer.status !== "paused") {
    return undefined;
  }

  const project = timer.task?.project?.title ?? "the paused project";
  return {
    message: `Resume tracking ${project}?`,
    info: [
      { name: "Project", value: timer.task?.project?.title },
      { name: "Paused since", value: timer.pause?.startDateTime },
    ],
  };
};

export default async function tool() {
  const before = await getTimerStatus();
  if (before.status !== "paused") {
    throw new Error(
      before.status === "running"
        ? "The timer is already running."
        : "No timer is paused, so there is nothing to resume.",
    );
  }

  const timer = await resumeTimer();

  return {
    status: timer.status,
    project: timer.task?.project?.title,
  };
}
