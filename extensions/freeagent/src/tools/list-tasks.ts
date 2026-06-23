import { fetchTasks } from "../services/freeagent";
import { provider } from "../oauth";

type Input = {
  /**
   * Optional full project URL — only return tasks for this project. Recommended for any
   * project-scoped operation.
   */
  projectUrl?: string;
  /**
   * "active" (default) or "all" to include completed/hidden tasks
   */
  view?: "active" | "all";
  /**
   * Optional substring to filter task name (case-insensitive)
   */
  search?: string;
};

/**
 * List tasks in FreeAgent, optionally scoped to a project. Returns each task's URL — required
 * by update-task, delete-task, and create-timeslip-ai.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required. Please authenticate with FreeAgent first.";

    const view = input.view ?? "active";
    const tasks = await fetchTasks(token, input.projectUrl, view);

    let filtered = tasks;
    if (input.search) {
      const q = input.search.toLowerCase();
      filtered = filtered.filter((t) => t.name.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      return `📋 No tasks found${input.projectUrl ? " for that project" : ""}${input.search ? ` matching "${input.search}"` : ""}.`;
    }

    let result = `📋 **${filtered.length} task(s)**${input.projectUrl ? ` (project ${input.projectUrl})` : ""} (view: ${view})\n\n`;
    filtered.slice(0, 100).forEach((t, i) => {
      result += `**${i + 1}. ${t.name}**\n`;
      result += `• Status: ${t.status}\n`;
      result += `• Billable: ${t.is_billable ? "Yes" : "No"}\n`;
      if (t.billing_rate && parseFloat(t.billing_rate) > 0) {
        result += `• Rate: ${t.billing_rate}/${t.billing_period}\n`;
      }
      result += `• URL: ${t.url}\n`;
      result += `• Project URL: ${t.project}\n\n`;
    });

    if (filtered.length > 100) {
      result += `... and ${filtered.length - 100} more.\n`;
    }
    return result;
  } catch (error) {
    console.error("List tasks error:", error);
    return `❌ Unable to list tasks. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
