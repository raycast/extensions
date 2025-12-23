import { getTasks } from "../composables/FetchData";
import { getTokens } from "../composables/WebClient";
import { logTime } from "../logTime";

type Input = {
  /** The message for the time booking */
  note: string;
  /** The UUID of the awork project to log time on */
  projectId: string;
  /** The UUID of the awork task to log time on */
  taskId: string;
  /** The UUID of the awork type of work */
  typeOfWorkId: string;
  /** The day for which to book time as an ISO 8601 date string */
  date?: string;
  /** The start time represented as an ISO 8601 time string or 'now' */
  startTime?: string;
  /**
   * The duration of the time booking in one of the following formats:
   * Xm (e.g. 15m)
   * Xh (e.g. 1h)
   * Xh Ym (e.g. 1h 30m)
   * XX,XX (e.g. 1,5)
   * XX:XX (e.g. 1:30)
   */
  duration: string;
};

export default async (input: Input) => {
  const tokens = await getTokens();
  if (!tokens) {
    return undefined;
  }
  const tasks = await getTasks(tokens.accessToken, input.taskId, 50)({ page: 0 });
  const task = tasks.data.find((t) => t.id === input.taskId);
  return logTime(
    tokens.accessToken,
    {
      note: input.note,
      projectId: input.projectId,
      taskId: input.taskId,
      typeOfWorkId: input.typeOfWorkId,
      date: input.date ? new Date(input.date) : new Date(),
      startTime: input.startTime,
      duration: input.duration,
      isBillable: task?.project?.isBillableByDefault ?? false,
    },
    tasks.data,
  );
};
