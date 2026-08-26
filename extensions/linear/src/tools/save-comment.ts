import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { serializeComment } from "./commentUtils";
import {
  client,
  findExact,
  resolveDocument,
  resolveInitiative,
  resolveIssue,
  resolveProject,
  tryGet,
} from "./linearUtils";

interface Input {
  body: string;
  id?: string;
  parentId?: string;
  issueId?: string;
  projectId?: string;
  initiativeId?: string;
  documentId?: string;
  milestoneId?: string;
  statusUpdateId?: string;
  statusUpdateType?: "project" | "initiative";
}

export default withAccessToken(linear)(async (input: Input) => {
  const linearClient = client();

  if ((input.id || input.parentId) && input.statusUpdateType) {
    throw new Error("statusUpdateType is only valid with statusUpdateId");
  }

  if (input.id) {
    const payload = await linearClient.updateComment(input.id, { body: input.body });
    return serializeComment(await payload.comment!);
  }

  if (input.parentId) {
    const payload = await linearClient.createComment({ body: input.body, parentId: input.parentId });
    return serializeComment(await payload.comment!);
  }

  const parents = [
    input.issueId,
    input.projectId,
    input.initiativeId,
    input.documentId,
    input.milestoneId,
    input.statusUpdateId,
  ].filter(Boolean);
  if (parents.length !== 1) {
    throw new Error("Provide exactly one comment parent");
  }

  let payload;
  if (input.issueId) {
    const issue = await resolveIssue(input.issueId);
    payload = await linearClient.createComment({ body: input.body, issueId: issue.id });
  } else if (input.projectId) {
    const project = await resolveProject(input.projectId);
    payload = await linearClient.createComment({ body: input.body, projectId: project.id });
  } else if (input.initiativeId) {
    const initiative = await resolveInitiative(input.initiativeId);
    payload = await linearClient.createComment({ body: input.body, initiativeId: initiative.id });
  } else if (input.documentId) {
    const document = await resolveDocument(input.documentId);
    if (!document.documentContentId) throw new Error(`Document "${input.documentId}" has no commentable content.`);
    payload = await linearClient.createComment({ body: input.body, documentContentId: document.documentContentId });
  } else if (input.milestoneId) {
    const milestone = findExact(
      (await linearClient.projectMilestones({ first: 250 })).nodes,
      input.milestoneId,
      "project milestone",
    );
    if (!milestone.documentContent) throw new Error(`Milestone "${input.milestoneId}" has no commentable content.`);
    payload = await linearClient.createComment({ body: input.body, documentContentId: milestone.documentContent.id });
  } else {
    const updateId = input.statusUpdateId!;
    if (input.statusUpdateType === "project") {
      const update = await linearClient.projectUpdate(updateId);
      payload = await linearClient.createComment({ body: input.body, projectUpdateId: update.id });
    } else if (input.statusUpdateType === "initiative") {
      const update = await linearClient.initiativeUpdate(updateId);
      payload = await linearClient.createComment({ body: input.body, initiativeUpdateId: update.id });
    } else {
      const projectUpdate = await tryGet(() => linearClient.projectUpdate(updateId));
      if (projectUpdate) {
        payload = await linearClient.createComment({ body: input.body, projectUpdateId: projectUpdate.id });
      } else {
        const initiativeUpdate = await linearClient.initiativeUpdate(updateId);
        payload = await linearClient.createComment({ body: input.body, initiativeUpdateId: initiativeUpdate.id });
      }
    }
  }

  return serializeComment(await payload.comment!);
});
