import { Tool } from "@raycast/api";
import { deleteTimeslip, fetchProject, fetchTask, fetchTimeslip } from "../services/freeagent";
import { provider } from "../oauth";

type Input = {
  /**
   * Full timeslip URL (from list-timeslips-ai)
   */
  timeslipUrl: string;
};

function extractId(url: string): string | null {
  const m = url.match(/\/timeslips\/(\d+)/);
  return m ? m[1] : null;
}

function extractIdFrom(url: string | undefined, segment: string): string | null {
  if (!url) return null;
  const m = url.match(new RegExp(`/${segment}/(\\d+)`));
  return m ? m[1] : null;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const id = extractId(input.timeslipUrl);
  if (!id) return { message: `Invalid timeslip URL: ${input.timeslipUrl}` };
  try {
    const token = await provider.authorize();
    if (!token) return { message: "Authentication required." };
    const ts = await fetchTimeslip(token, id);
    const taskId = extractIdFrom(typeof ts.task === "string" ? ts.task : undefined, "tasks");
    const projectId = extractIdFrom(typeof ts.project === "string" ? ts.project : undefined, "projects");
    const [task, project] = await Promise.all([
      taskId ? fetchTask(token, taskId).catch(() => null) : null,
      projectId ? fetchProject(token, projectId).catch(() => null) : null,
    ]);
    const taskName = task?.name ?? ts.task;
    const projectName = project?.name ?? ts.project;
    return {
      message: `Delete this timeslip? This cannot be undone.`,
      info: [
        { name: "Date", value: ts.dated_on },
        { name: "Hours", value: ts.hours },
        { name: "Task", value: String(taskName) },
        { name: "Project", value: String(projectName) },
        ...(ts.comment ? [{ name: "Comment", value: ts.comment }] : []),
        { name: "URL", value: ts.url },
      ],
    };
  } catch {
    return { message: `Delete timeslip at ${input.timeslipUrl}? This cannot be undone.` };
  }
};

/**
 * Permanently delete a timeslip. Confirmation required.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    const id = extractId(input.timeslipUrl);
    if (!id) return "❌ Invalid timeslip URL.";

    await deleteTimeslip(token, id);
    return `✅ Timeslip deleted: ${input.timeslipUrl}`;
  } catch (error) {
    console.error("Delete timeslip error:", error);
    return `❌ Unable to delete timeslip. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
