import { fetchProjects } from "../services/freeagent";
import { provider } from "../oauth";

type Input = {
  /**
   * Which set of projects to list ("active" by default, or "all" to include hidden/completed)
   */
  view?: "active" | "all";
  /**
   * Optional substring to filter project name or contact name (case-insensitive)
   */
  search?: string;
};

/**
 * List projects in FreeAgent. Returns each project's URL — required by the create-task-ai,
 * update-task, list-tasks, list-timeslips-ai, create-timeslip-ai, update-project, and
 * delete-project tools.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) {
      return "❌ Authentication required. Please authenticate with FreeAgent first.";
    }

    const view = input.view ?? "active";
    const projects = await fetchProjects(token, view);

    let filtered = projects;
    if (input.search) {
      const q = input.search.toLowerCase();
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(q) || (p.contact_name || "").toLowerCase().includes(q),
      );
    }

    if (filtered.length === 0) {
      return `📂 No projects found${input.search ? ` matching "${input.search}"` : ""}.`;
    }

    let result = `📂 **${filtered.length} project(s)** (view: ${view})\n\n`;
    filtered.slice(0, 50).forEach((p, i) => {
      result += `**${i + 1}. ${p.name}**\n`;
      result += `• Client: ${p.contact_name}\n`;
      result += `• Status: ${p.status}\n`;
      result += `• Currency: ${p.currency}\n`;
      result += `• Billable: ${p.is_billable ? "Yes" : "No"}\n`;
      if (p.budget) {
        result += `• Budget: ${p.budget}\n`;
      }
      result += `• URL: ${p.url}\n`;
      result += `• Contact URL: ${p.contact}\n\n`;
    });

    if (filtered.length > 50) {
      result += `... and ${filtered.length - 50} more. Use a narrower search.\n`;
    }

    return result;
  } catch (error) {
    console.error("List projects error:", error);
    return `❌ Unable to list projects. Error: ${error instanceof Error ? error.message : String(error)}`;
  }
}
