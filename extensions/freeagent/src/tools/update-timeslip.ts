import { Tool } from "@raycast/api";
import { fetchProject, fetchTask, fetchTimeslip, updateTimeslip } from "../services/freeagent";
import { provider } from "../oauth";
import { TimeslipUpdateData } from "../types";

type Input = {
  /**
   * Full timeslip URL (from list-timeslips-ai)
   */
  timeslipUrl: string;
  /**
   * Change which task the timeslip is logged against (full task URL). Project is inferred
   * automatically.
   */
  taskUrl?: string;
  /**
   * New date (YYYY-MM-DD)
   */
  datedOn?: string;
  /**
   * New hours value
   */
  hours?: number;
  /**
   * New comment
   */
  comment?: string;
};

function extractTimeslipId(url: string): string | null {
  const m = url.match(/\/timeslips\/(\d+)/);
  return m ? m[1] : null;
}

function extractTaskId(url: string): string | null {
  const m = url.match(/\/tasks\/(\d+)/);
  return m ? m[1] : null;
}

function extractProjectId(url: string): string | null {
  const m = url.match(/\/projects\/(\d+)/);
  return m ? m[1] : null;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const id = extractTimeslipId(input.timeslipUrl);
  if (!id) return { message: `Invalid timeslip URL: ${input.timeslipUrl}` };

  const info: { name: string; value: string }[] = [{ name: "Timeslip URL", value: input.timeslipUrl }];

  try {
    const token = await provider.authorize();
    if (token) {
      const ts = await fetchTimeslip(token, id);
      const taskId = typeof ts.task === "string" ? extractTaskId(ts.task) : null;
      const projectId = typeof ts.project === "string" ? extractProjectId(ts.project) : null;
      const [task, project] = await Promise.all([
        taskId ? fetchTask(token, taskId).catch(() => null) : null,
        projectId ? fetchProject(token, projectId).catch(() => null) : null,
      ]);
      const currentTaskName = task?.name ?? ts.task;
      const currentProjectName = project?.name ?? ts.project;
      info.push({
        name: "Current",
        value: `${ts.hours}h on ${ts.dated_on} — ${currentTaskName} (${currentProjectName})`,
      });
    }
  } catch {
    /* ignore */
  }

  if (input.taskUrl) info.push({ name: "→ New task", value: input.taskUrl });
  if (input.datedOn) info.push({ name: "→ New date", value: input.datedOn });
  if (input.hours !== undefined) info.push({ name: "→ New hours", value: String(input.hours) });
  if (input.comment !== undefined) info.push({ name: "→ New comment", value: input.comment });

  return { message: `Update timeslip ${input.timeslipUrl}?`, info };
};

/**
 * Edit an existing timeslip, including switching it to a different task. Confirmation required.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    const id = extractTimeslipId(input.timeslipUrl);
    if (!id) return "❌ Invalid timeslip URL.";

    const data: TimeslipUpdateData = {};
    if (input.taskUrl) {
      const taskId = extractTaskId(input.taskUrl);
      if (!taskId) return "❌ Invalid task URL.";
      const task = await fetchTask(token, taskId);
      data.task = task.url;
      data.project = task.project;
    }
    if (input.datedOn !== undefined) data.dated_on = input.datedOn;
    if (input.hours !== undefined) data.hours = input.hours;
    if (input.comment !== undefined) data.comment = input.comment;

    if (Object.keys(data).length === 0) return "❌ No fields to update.";

    const ts = await updateTimeslip(token, id, data);
    return (
      `✅ **Timeslip updated**\n\n` +
      `⏱ ${ts.hours}h on ${ts.dated_on}\n` +
      (ts.comment ? `• Comment: ${ts.comment}\n` : "") +
      `• URL: ${ts.url}\n`
    );
  } catch (error) {
    console.error("Update timeslip error:", error);
    return `❌ Unable to update timeslip. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
