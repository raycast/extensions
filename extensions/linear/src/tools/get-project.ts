import { resolveProject } from "./linearUtils";
import { withToolAuth } from "./resolveToolWorkspace";
type Input = {
  query: string;
  includeMilestones?: boolean;
  includeMembers?: boolean;
  includeResources?: boolean;
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};
export default withToolAuth(async (input: Input) => {
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
