import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { resolveProject } from "./linearUtils";
type Input = { query: string; includeMilestones?: boolean; includeMembers?: boolean; includeResources?: boolean };
export default withAccessToken(linear)(async (input: Input) => {
  const project = await resolveProject(input.query);
  return {
    ...project,
    milestones: input.includeMilestones ? (await project.projectMilestones({ first: 250 })).nodes : undefined,
    members: input.includeMembers ? (await project.members({ first: 250 })).nodes : undefined,
    resources: input.includeResources
      ? {
          documents: (await project.documents({ first: 250 })).nodes,
          links: (await project.externalLinks({ first: 250 })).nodes,
          attachments: (await project.attachments({ first: 250 })).nodes,
        }
      : undefined,
  };
});
