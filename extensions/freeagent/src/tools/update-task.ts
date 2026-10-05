import { Tool } from "@raycast/api";
import { fetchTask, updateTask } from "../services/freeagent";
import { provider } from "../oauth";
import { TaskUpdateData } from "../types";

type Input = {
  /**
   * Full task URL (from list-tasks)
   */
  taskUrl: string;
  /**
   * New name
   */
  name?: string;
  /**
   * Toggle billable
   */
  isBillable?: boolean;
  /**
   * New billing rate (numeric string)
   */
  billingRate?: string;
  /**
   * New billing period ("hour", "day", "week", "month", "year")
   */
  billingPeriod?: "hour" | "day" | "week" | "month" | "year";
  /**
   * "Active", "Completed", or "Hidden"
   */
  status?: "Active" | "Completed" | "Hidden";
};

function extractId(url: string): string | null {
  const m = url.match(/\/tasks\/(\d+)/);
  return m ? m[1] : null;
}

function buildUpdate(input: Input): TaskUpdateData {
  const data: TaskUpdateData = {};
  if (input.name !== undefined) data.name = input.name;
  if (input.isBillable !== undefined) data.is_billable = input.isBillable;
  if (input.billingRate !== undefined) data.billing_rate = input.billingRate;
  if (input.billingPeriod !== undefined) data.billing_period = input.billingPeriod;
  if (input.status !== undefined) data.status = input.status;
  return data;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const id = extractId(input.taskUrl);
  if (!id) return { message: `Invalid task URL: ${input.taskUrl}` };

  const update = buildUpdate(input);
  const info: { name: string; value: string }[] = [{ name: "Task URL", value: input.taskUrl }];

  try {
    const token = await provider.authorize();
    if (token) {
      const task = await fetchTask(token, id);
      info.unshift({ name: "Current name", value: task.name });
      info.push({ name: "Current status", value: task.status });
    }
  } catch {
    /* ignore */
  }

  for (const [k, v] of Object.entries(update)) {
    info.push({ name: `→ ${k}`, value: String(v) });
  }

  return {
    message: `Update task ${input.taskUrl}?`,
    info,
  };
};

/**
 * Update a task in FreeAgent. Confirmation required.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    const id = extractId(input.taskUrl);
    if (!id) return "❌ Invalid task URL.";

    const data = buildUpdate(input);
    if (Object.keys(data).length === 0) return "❌ No fields to update.";

    const task = await updateTask(token, id, data);
    return (
      `✅ **Task updated**\n\n` +
      `📋 **${task.name}**\n` +
      `• Status: ${task.status}\n` +
      `• Billable: ${task.is_billable ? "Yes" : "No"}\n` +
      (task.billing_rate ? `• Rate: ${task.billing_rate}/${task.billing_period}\n` : "") +
      `• URL: ${task.url}\n`
    );
  } catch (error) {
    console.error("Update task error:", error);
    return `❌ Unable to update task. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
