import { InitiativeUpdateHealthType, ProjectUpdateHealthType } from "@linear/sdk";

import { client, resolveInitiative, resolveProject } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";

type Input = {
  type: "project" | "initiative";
  id?: string;
  project?: string;
  initiative?: string;
  body?: string;
  health?: "onTrack" | "atRisk" | "offTrack";
  isDiffHidden?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async (input: Input) => {
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
    if (!result.success || !update) throw new Error("Failed to update status update.");
    return update;
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
    if (!result.success || !result.projectUpdate) throw new Error("Failed to create project update.");
    return result.projectUpdate;
  }
  if (!input.initiative) throw new Error("initiative is required when creating an initiative status update.");
  const initiative = await resolveInitiative(input.initiative);
  const result = await client().createInitiativeUpdate({
    initiativeId: initiative.id,
    body: input.body,
    health: input.health as InitiativeUpdateHealthType,
    isDiffHidden: input.isDiffHidden,
  });
  if (!result.success || !result.initiativeUpdate) throw new Error("Failed to create initiative update.");
  return result.initiativeUpdate;
});
