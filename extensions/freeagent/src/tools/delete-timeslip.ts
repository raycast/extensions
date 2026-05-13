import { Tool } from "@raycast/api";
import { deleteTimeslip, fetchTimeslip } from "../services/freeagent";
import { provider } from "../oauth";
import { Project, Task } from "../types";

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

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const id = extractId(input.timeslipUrl);
  if (!id) return { message: `Invalid timeslip URL: ${input.timeslipUrl}` };
  try {
    const token = await provider.authorize();
    if (!token) return { message: "Authentication required." };
    const ts = await fetchTimeslip(token, id);
    const taskName = typeof ts.task === "object" ? (ts.task as Task).name : ts.task;
    const projectName = typeof ts.project === "object" ? (ts.project as Project).name : ts.project;
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
