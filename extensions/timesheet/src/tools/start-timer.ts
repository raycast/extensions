import { Tool } from "@raycast/api";
import { getProject, getTimerStatus, startTimer } from "../api";

type Input = {
  /**
   * The ID of the project to track time against. Use the `list-projects` tool
   * to look up the ID from a project name.
   */
  projectId: string;
  /**
   * Optional time the timer should have started, in ISO 8601 format
   * (for example "2026-09-11T09:00:00Z"). Defaults to now.
   */
  startDateTime?: string;
};

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const [project, timer] = await Promise.all([
    getProject(input.projectId),
    getTimerStatus(),
  ]);

  if (timer.status === "stopped") {
    return {
      message: `Start tracking ${project.title}?`,
      info: [
        { name: "Project", value: project.title },
        { name: "Start time", value: input.startDateTime },
      ],
    };
  }

  // Starting a timer while one is already running closes the old task, so the
  // user has to see which project they are about to leave.
  return {
    message: `A timer is already ${timer.status} for ${timer.task?.project?.title ?? "another project"}. Start tracking ${project.title} instead?`,
    info: [
      { name: "Currently tracking", value: timer.task?.project?.title },
      { name: "New project", value: project.title },
      { name: "Start time", value: input.startDateTime },
    ],
  };
};

export default async function tool(input: Input) {
  const timer = await startTimer(input.projectId, input.startDateTime);

  return {
    status: timer.status,
    project: timer.task?.project?.title,
    startedAt: timer.task?.startDateTime,
  };
}
