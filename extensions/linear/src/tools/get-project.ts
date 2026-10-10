import { resolveProject } from "./linearUtils";
import {
  serializeAttachment,
  serializeDocument,
  serializeExternalLink,
  serializeMilestone,
  serializeProject,
  userRef,
} from "./serializers";
import { withLinear } from "./withLinear";
type Input = { query: string; includeMilestones?: boolean; includeMembers?: boolean; includeResources?: boolean };
export default withLinear(async (input: Input) => {
  const project = await resolveProject(input.query);
  return {
    ...serializeProject(project),
    milestones: input.includeMilestones
      ? (await project.projectMilestones({ first: 250 })).nodes.map(serializeMilestone)
      : undefined,
    members: input.includeMembers ? (await project.members({ first: 250 })).nodes.map(userRef) : undefined,
    resources: input.includeResources
      ? {
          documents: (await project.documents({ first: 250 })).nodes.map((document) =>
            serializeDocument(document, { content: false }),
          ),
          links: (await project.externalLinks({ first: 250 })).nodes.map(serializeExternalLink),
          attachments: (await project.attachments({ first: 250 })).nodes.map(serializeAttachment),
        }
      : undefined,
  };
});
