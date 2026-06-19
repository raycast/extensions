import { Tool } from "@raycast/api";
import { createTask, fetchProject } from "../services/freeagent";
import { provider } from "../oauth";
import { TaskCreateData } from "../types";

type Input = {
  /**
   * Full project URL the task belongs to (from list-projects)
   */
  projectUrl: string;
  /**
   * Task name
   */
  name: string;
  /**
   * Whether the task is billable. Defaults to true.
   */
  isBillable?: boolean;
  /**
   * Billing rate (numeric string, e.g. "85.00")
   */
  billingRate?: string;
  /**
   * Billing period ("hour", "day", "week", "month", "year")
   */
  billingPeriod?: "hour" | "day" | "week" | "month" | "year";
  /**
   * "Active" (default) or "Completed"/"Hidden"
   */
  status?: "Active" | "Completed" | "Hidden";
  /**
   * Currency override (ISO code). Defaults to the project's currency.
   */
  currency?: string;
};

function extractProjectId(url: string): string | null {
  const m = url.match(/\/projects\/(\d+)/);
  return m ? m[1] : null;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  return {
    message: `Create task "${input.name}"?`,
    info: [
      { name: "Name", value: input.name },
      { name: "Project URL", value: input.projectUrl },
      { name: "Billable", value: input.isBillable === false ? "No" : "Yes" },
      ...(input.billingRate ? [{ name: "Rate", value: `${input.billingRate}/${input.billingPeriod || "hour"}` }] : []),
      { name: "Status", value: input.status || "Active" },
    ],
  };
};

/**
 * Create a task within a project in FreeAgent. Confirmation required.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    if (!input.projectUrl) return "❌ Project URL is required (use list-projects).";
    if (!input.name) return "❌ Task name is required.";

    const projectId = extractProjectId(input.projectUrl);
    if (!projectId) return "❌ Invalid project URL.";

    let currency = input.currency;
    if (!currency) {
      const project = await fetchProject(token, projectId);
      currency = project.currency;
    }

    const data: TaskCreateData = {
      name: input.name,
      currency,
      is_billable: input.isBillable !== false,
      status: input.status || "Active",
    };
    if (input.billingRate) data.billing_rate = input.billingRate;
    if (input.billingPeriod) data.billing_period = input.billingPeriod;

    const task = await createTask(token, input.projectUrl, data);
    return (
      `✅ **Task created**\n\n` +
      `📋 **${task.name}**\n` +
      `• Status: ${task.status}\n` +
      `• Billable: ${task.is_billable ? "Yes" : "No"}\n` +
      (task.billing_rate ? `• Rate: ${task.billing_rate}/${task.billing_period}\n` : "") +
      `• URL: ${task.url}\n`
    );
  } catch (error) {
    console.error("Create task error:", error);
    return `❌ Unable to create task. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
