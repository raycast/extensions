import { fetchTimeslipsFiltered } from "../services/freeagent";
import { provider } from "../oauth";
import { Task, Project, User } from "../types";

type Input = {
  /**
   * "all" (default), "unbilled", or "running"
   */
  view?: "all" | "unbilled" | "running";
  /**
   * Filter to a specific project (full project URL)
   */
  projectUrl?: string;
  /**
   * Filter to a specific task (full task URL)
   */
  taskUrl?: string;
  /**
   * Filter to a specific user (full user URL)
   */
  userUrl?: string;
  /**
   * Start date inclusive (YYYY-MM-DD)
   */
  fromDate?: string;
  /**
   * End date inclusive (YYYY-MM-DD)
   */
  toDate?: string;
};

/**
 * List timeslips in FreeAgent with optional filtering. Returns each timeslip's URL — required
 * by update-timeslip and delete-timeslip. Includes nested task/project/user details so the
 * caller can resolve names without extra lookups.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    const timeslips = await fetchTimeslipsFiltered(token, {
      view: input.view ?? "all",
      project: input.projectUrl,
      task: input.taskUrl,
      user: input.userUrl,
      fromDate: input.fromDate,
      toDate: input.toDate,
      nested: true,
    });

    if (timeslips.length === 0) {
      return `⏱ No timeslips found for those filters.`;
    }

    let result = `⏱ **${timeslips.length} timeslip(s)**\n\n`;
    timeslips.slice(0, 100).forEach((t, i) => {
      const taskName = typeof t.task === "object" ? (t.task as Task).name : t.task;
      const projectName = typeof t.project === "object" ? (t.project as Project).name : t.project;
      const userName =
        typeof t.user === "object" ? `${(t.user as User).first_name} ${(t.user as User).last_name}` : t.user;

      result += `**${i + 1}. ${t.dated_on} — ${t.hours}h**\n`;
      result += `• Task: ${taskName}\n`;
      result += `• Project: ${projectName}\n`;
      result += `• User: ${userName}\n`;
      if (t.comment) result += `• Comment: ${t.comment}\n`;
      result += `• URL: ${t.url}\n\n`;
    });

    if (timeslips.length > 100) {
      result += `... and ${timeslips.length - 100} more. Narrow with filters.\n`;
    }
    return result;
  } catch (error) {
    console.error("List timeslips error:", error);
    return `❌ Unable to list timeslips. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
