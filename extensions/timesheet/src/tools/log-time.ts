import { Tool } from "@raycast/api";
import { createTask, formatDurationHuman, getProject } from "../api";

type Input = {
  /**
   * The ID of the project to log against. Use the `list-projects` tool to look up
   * the ID from a project name.
   */
  projectId: string;
  /**
   * When the work started, in ISO 8601 format (for example "2026-09-11T09:00:00Z").
   */
  startDateTime: string;
  /**
   * When the work ended, in ISO 8601 format. Must be after `startDateTime`.
   */
  endDateTime: string;
  /**
   * Optional note describing what was worked on.
   */
  description?: string;
  /**
   * Whether the entry is billable. Defaults to the project's own setting.
   */
  billable?: boolean;
};

function durationLabel(start: string, end: string): string | undefined {
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms > 0 ? formatDurationHuman(ms) : undefined;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const project = await getProject(input.projectId);

  return {
    message: `Log time on ${project.title}?`,
    info: [
      { name: "Project", value: project.title },
      { name: "From", value: input.startDateTime },
      { name: "To", value: input.endDateTime },
      {
        name: "Duration",
        value: durationLabel(input.startDateTime, input.endDateTime),
      },
      { name: "Description", value: input.description },
    ],
  };
};

export default async function tool(input: Input) {
  const start = new Date(input.startDateTime).getTime();
  const end = new Date(input.endDateTime).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    throw new Error(
      "startDateTime and endDateTime must be valid ISO 8601 timestamps.",
    );
  }
  if (end <= start) {
    throw new Error("endDateTime must be after startDateTime.");
  }

  const task = await createTask({
    projectId: input.projectId,
    startDateTime: input.startDateTime,
    endDateTime: input.endDateTime,
    description: input.description,
    billable: input.billable,
  });

  return {
    id: task.id,
    project: task.project?.title,
    startDateTime: task.startDateTime,
    endDateTime: task.endDateTime,
    durationMinutes: task.duration ? Math.round(task.duration / 60) : undefined,
  };
}
