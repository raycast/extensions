import { withAccessToken } from "@raycast/utils";
import { authorize } from "../lib/auth";
import { appUrl } from "../lib/config";
import { type ProjectState, listProjects } from "../lib/twelfth";

type Input = {
  /**
   * Which projects: "live" (the default), "closed", "archived" or "all".
   */
  state?: ProjectState;
};

async function tool(input: Input) {
  const projects = await listProjects(input.state ?? "live");
  return projects.map((project) => ({
    name: project.name,
    workflow: project.workflowLabel,
    status: project.status,
    stage: project.stage ? `${project.stage.label} (${project.stage.index + 1} of ${project.stage.total})` : null,
    owner: project.owner?.name ?? null,
    openTasks: project.openTaskCount,
    overdueTasks: project.overdueTaskCount,
    updatedAt: project.updatedAt,
    url: appUrl(`/app/projects/${encodeURIComponent(project.id)}`),
  }));
}

export default withAccessToken({ authorize })(tool);
