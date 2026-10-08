import { Tool } from "@raycast/api";
import { deleteProject, fetchProject } from "../services/freeagent";
import { provider } from "../oauth";

type Input = {
  /**
   * Full project URL (from list-projects)
   */
  projectUrl: string;
};

function extractId(url: string): string | null {
  const m = url.match(/\/projects\/(\d+)/);
  return m ? m[1] : null;
}

export const confirmation: Tool.Confirmation<Input> = async (input) => {
  const id = extractId(input.projectUrl);
  if (!id) {
    return { message: `Invalid project URL: ${input.projectUrl}` };
  }
  try {
    const token = await provider.authorize();
    if (!token) return { message: "Authentication required." };
    const project = await fetchProject(token, id);
    return {
      message: `Delete project "${project.name}"? This cannot be undone.`,
      info: [
        { name: "Name", value: project.name },
        { name: "Client", value: project.contact_name },
        { name: "Status", value: project.status },
        { name: "URL", value: project.url },
      ],
    };
  } catch {
    return {
      message: `Delete project at ${input.projectUrl}? This cannot be undone.`,
    };
  }
};

/**
 * Permanently delete a project in FreeAgent. Confirmation required.
 */
export default async function tool(input: Input) {
  try {
    const token = await provider.authorize();
    if (!token) return "❌ Authentication required.";

    const id = extractId(input.projectUrl);
    if (!id) return "❌ Invalid project URL. Expected .../projects/{id}.";

    await deleteProject(token, id);
    return `✅ Project deleted: ${input.projectUrl}`;
  } catch (error) {
    console.error("Delete project error:", error);
    const msg = error instanceof Error ? error.message : String(error);
    if (msg.includes("422") || msg.includes("400")) {
      return `❌ Cannot delete this project — it may have invoices, tasks, or timeslips attached. Mark it as "Hidden" or "Completed" instead.`;
    }
    return `❌ Unable to delete project. Error: ${msg}`;
  }
}
