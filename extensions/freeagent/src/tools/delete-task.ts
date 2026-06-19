import { Tool } from "@raycast/api";
import { deleteTask, fetchTask } from "../services/freeagent";
import { provider } from "../oauth";

type Input = {
  /**
   * Full task URL (from list-tasks)
   */
  taskUrl: string;
};

function extractId(url: string): string | null {
  const m = url.match(/\/tasks\/(\d+)/);
  return m ? m[1] : null;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const id = extractId(input.taskUrl);
  if (!id) return { message: `Invalid task URL: ${input.taskUrl}` };
  try {
    const token = await provider.authorize();
    if (!token) return { message: "Authentication required." };
    const task = await fetchTask(token, id);
    return {
      message: `Delete task "${task.name}"? This cannot be undone.`,
      info: [
        { name: "Name", value: task.name },
        { name: "Status", value: task.status },
        { name: "Deletable", value: task.is_deletable ? "Yes" : "No (has timeslips)" },
        { name: "URL", value: task.url },
      ],
    };
  } catch {
    return { message: `Delete task at ${input.taskUrl}? This cannot be undone.` };
  }
};

/**
 * Permanently delete a task. Confirmation required. Tasks with timeslips cannot be deleted —
 * mark them "Hidden" or "Completed" via update-task instead.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    const id = extractId(input.taskUrl);
    if (!id) return "❌ Invalid task URL.";

    await deleteTask(token, id);
    return `✅ Task deleted: ${input.taskUrl}`;
  } catch (error) {
    console.error("Delete task error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("422") || msg.includes("400")) {
      return `❌ Cannot delete this task — it likely has timeslips. Use update-task with status="Hidden" or "Completed" instead.`;
    }
    return `❌ Unable to delete task. Error: ${msg}`;
  }
}
