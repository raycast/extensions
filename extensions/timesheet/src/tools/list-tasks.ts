import { getTaskDurationMs, getTasks, localDate } from "../api";

type Input = {
  /**
   * First day to include, as a date in YYYY-MM-DD format. Defaults to today.
   */
  startDate?: string;
  /**
   * Last day to include, as a date in YYYY-MM-DD format. Defaults to `startDate`.
   */
  endDate?: string;
  /**
   * Only return entries for this project. Use the `list-projects` tool to look up
   * the ID from a project name.
   */
  projectId?: string;
};

export default async function tool(input: Input) {
  const startDate = input.startDate ?? localDate();
  const endDate = input.endDate ?? startDate;

  const tasks = await getTasks({
    startDate,
    endDate,
    projectId: input.projectId,
  });
  const totalMinutes = tasks.reduce(
    (sum, task) => sum + Math.round(getTaskDurationMs(task) / 60000),
    0,
  );

  return {
    startDate,
    endDate,
    totalMinutes,
    tasks: tasks.map((task) => ({
      id: task.id,
      project: task.project?.title,
      description: task.description,
      startDateTime: task.startDateTime,
      endDateTime: task.endDateTime,
      durationMinutes: Math.round(getTaskDurationMs(task) / 60000),
      billable: task.billable,
      running: task.running,
    })),
  };
}
