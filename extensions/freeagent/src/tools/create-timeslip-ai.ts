import { Tool } from "@raycast/api";
import { createTimeslip, fetchTask, getCurrentUser } from "../services/freeagent";
import { provider } from "../oauth";
import { TimeslipCreateData } from "../types";

type Input = {
  /**
   * Full task URL (from list-tasks). The project is inferred from the task.
   */
  taskUrl: string;
  /**
   * Date worked (YYYY-MM-DD)
   */
  datedOn: string;
  /**
   * Hours worked (numeric, e.g. 1.5)
   */
  hours: number;
  /**
   * Optional comment / description of the work
   */
  comment?: string;
  /**
   * Full user URL to log against. Defaults to the authenticated user.
   */
  userUrl?: string;
};

function extractTaskId(url: string): string | null {
  const m = url.match(/\/tasks\/(\d+)/);
  return m ? m[1] : null;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Log ${input.hours}h on ${input.datedOn}?`,
    info: [
      { name: "Task URL", value: input.taskUrl },
      { name: "Date", value: input.datedOn },
      { name: "Hours", value: String(input.hours) },
      ...(input.comment ? [{ name: "Comment", value: input.comment }] : []),
      ...(input.userUrl ? [{ name: "User URL", value: input.userUrl }] : []),
    ],
  };
};

/**
 * Create a timeslip (timesheet entry) for a task in FreeAgent. Confirmation required.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    if (!input.taskUrl) return "❌ Task URL is required (use list-tasks).";
    if (!input.datedOn) return "❌ Date (YYYY-MM-DD) is required.";
    if (input.hours === undefined || input.hours === null) return "❌ Hours is required.";
    if (input.hours <= 0) return "❌ Hours must be a positive number.";

    const taskId = extractTaskId(input.taskUrl);
    if (!taskId) return "❌ Invalid task URL.";

    const task = await fetchTask(token, taskId);

    let userUrl = input.userUrl;
    if (!userUrl) {
      const me = await getCurrentUser(token);
      userUrl = me.url;
    }

    const data: TimeslipCreateData = {
      task: task.url,
      project: task.project,
      user: userUrl,
      dated_on: input.datedOn,
      hours: input.hours,
      comment: input.comment,
    };

    const timeslip = await createTimeslip(token, data);
    return (
      `✅ **Timeslip logged**\n\n` +
      `⏱ ${timeslip.hours}h on ${timeslip.dated_on}\n` +
      `• Task: ${task.name}\n` +
      (timeslip.comment ? `• Comment: ${timeslip.comment}\n` : "") +
      `• URL: ${timeslip.url}\n`
    );
  } catch (error) {
    console.error("Create timeslip error:", error);
    return `❌ Unable to create timeslip. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
