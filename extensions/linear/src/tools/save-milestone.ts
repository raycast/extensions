import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { client, resolveMilestone, resolveProject } from "./linearUtils";
type Input = { project: string; id?: string; name?: string; description?: string; targetDate?: string };
export default withAccessToken(linear)(async (input: Input) => {
  const project = await resolveProject(input.project);
  if (input.id) {
    const milestone = await resolveMilestone(project.id, input.id);
    const result = await client().updateProjectMilestone(milestone.id, {
      name: input.name,
      description: input.description,
      targetDate: input.targetDate,
    });
    if (!result.success) throw new Error("Failed to update project milestone.");
    return result.projectMilestone;
  }
  if (!input.name) throw new Error("name is required when creating a milestone.");
  const result = await client().createProjectMilestone({
    projectId: project.id,
    name: input.name,
    description: input.description,
    targetDate: input.targetDate,
  });
  if (!result.success) throw new Error("Failed to create project milestone.");
  return result.projectMilestone;
});
