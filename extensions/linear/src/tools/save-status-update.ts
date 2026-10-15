import { InitiativeUpdateHealthType, ProjectUpdateHealthType } from "@linear/sdk";

import { client, resolveInitiative, resolveProject } from "./linearUtils";
import { serializeStatusUpdate } from "./serializers";
import { withLinear } from "./withLinear";

type Input = {
  type: "project" | "initiative";
  id?: string;
  project?: string;
  initiative?: string;
  body?: string;
  health?: "onTrack" | "atRisk" | "offTrack";
  isDiffHidden?: boolean;
};

export default withLinear(async (input: Input) => {
  if (input.id) {
    const result =
      input.type === "project"
        ? await client().updateProjectUpdate(input.id, {
            body: input.body,
            health: input.health as ProjectUpdateHealthType,
          })
        : await client().updateInitiativeUpdate(input.id, {
            body: input.body,
            health: input.health as InitiativeUpdateHealthType,
          });
    const update = "projectUpdate" in result ? result.projectUpdate : result.initiativeUpdate;
    const updated = result.success ? await update : undefined;
    if (!updated) throw new Error("Failed to update status update.");
    return serializeStatusUpdate(updated);
  }
  if (input.type === "project") {
    if (!input.project) throw new Error("project is required when creating a project status update.");
    const project = await resolveProject(input.project);
    const result = await client().createProjectUpdate({
      projectId: project.id,
      body: input.body,
      health: input.health as ProjectUpdateHealthType,
      isDiffHidden: input.isDiffHidden,
    });
    const created = result.success ? await result.projectUpdate : undefined;
    if (!created) throw new Error("Failed to create project update.");
    return serializeStatusUpdate(created);
  }
  if (!input.initiative) throw new Error("initiative is required when creating an initiative status update.");
  const initiative = await resolveInitiative(input.initiative);
  const result = await client().createInitiativeUpdate({
    initiativeId: initiative.id,
    body: input.body,
    health: input.health as InitiativeUpdateHealthType,
    isDiffHidden: input.isDiffHidden,
  });
  const created = result.success ? await result.initiativeUpdate : undefined;
  if (!created) throw new Error("Failed to create initiative update.");
  return serializeStatusUpdate(created);
});
