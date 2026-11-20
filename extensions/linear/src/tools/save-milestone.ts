import { client, resolveMilestone, resolveProject } from "./linearUtils";
import { serializeMilestone } from "./serializers";
import { withLinear } from "./withLinear";
type Input = {
  /** Project name, ID, or slug. Required when creating; optional when updating by milestone ID. */
  project?: string;
  id?: string;
  name?: string;
  description?: string;
  targetDate?: string;
};
export default withLinear(async (input: Input) => {
  if (input.id) {
    const milestone = input.project
      ? await resolveMilestone(input.project, input.id)
      : await client().projectMilestone(input.id);
    const result = await client().updateProjectMilestone(milestone.id, {
      name: input.name,
      description: input.description,
      targetDate: input.targetDate,
    });
    const updated = result.success ? await result.projectMilestone : undefined;
    if (!updated) throw new Error("Failed to update project milestone.");
    return serializeMilestone(updated);
  }
  if (!input.project) throw new Error("project is required when creating a milestone.");
  if (!input.name) throw new Error("name is required when creating a milestone.");
  const project = await resolveProject(input.project);
  const result = await client().createProjectMilestone({
    projectId: project.id,
    name: input.name,
    description: input.description,
    targetDate: input.targetDate,
  });
  const created = result.success ? await result.projectMilestone : undefined;
  if (!created) throw new Error("Failed to create project milestone.");
  return serializeMilestone(created);
});
