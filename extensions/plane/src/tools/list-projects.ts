import { requirePlaneClient } from "../api/auth";
import { getCachedProjects } from "../api/ai";
import { getProjectUrl } from "../helpers/work-items";
import { withPlane } from "../helpers/with-plane";

/** Lists the Plane projects the user is a member of in the current workspace. */
export default withPlane(async () => {
  const client = requirePlaneClient();
  const projects = await getCachedProjects();
  return {
    workspace: client.workspaceSlug,
    projects: projects.map((project) => ({
      id: project.id,
      identifier: project.identifier,
      name: project.name,
      description: project.description || undefined,
      url: project.id ? getProjectUrl(client.workspaceSlug, project.id) : undefined,
      cyclesEnabled: project.cycleView,
      modulesEnabled: project.moduleView,
      intakeEnabled: project.intakeView,
    })),
  };
});
