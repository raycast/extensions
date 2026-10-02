import { client, resolveMilestone, resolveProject } from "./linearUtils";
import { serializeMilestone } from "./serializers";
import { withLinear } from "./withLinear";
type Input = { project: string; id?: string; name?: string; description?: string; targetDate?: string };
export default withLinear(async (input: Input) => {
  const project = await resolveProject(input.project);
  if (input.id) {
    const milestone = await resolveMilestone(project.id, input.id);
    const result = await client().updateProjectMilestone(milestone.id, {
      name: input.name,
      description: input.description,
      targetDate: input.targetDate,
    });
    const updated = result.success ? await result.projectMilestone : undefined;
    if (!updated) throw new Error("Failed to update project milestone.");
    return serializeMilestone(updated);
  }
  if (!input.name) throw new Error("name is required when creating a milestone.");
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
