import { LinearClient, PaginationOrderBy } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { linear } from "../api/linearClient";

import { serializeComment } from "./commentUtils";
import {
  client,
  collect,
  PageInput,
  resolveDocument,
  resolveInitiative,
  resolveIssue,
  resolveProject,
  tryGet,
} from "./linearUtils";

interface Input extends PageInput {
  /** Max results (default 50, max 250) */ limit?: number;
  /** Next page cursor */ cursor?: string;
  /** Sort: createdAt | updatedAt */ orderBy?: "createdAt" | "updatedAt";
  /** Issue ID or identifier. Provide exactly one parent. */ issueId?: string;
  /** Project name or ID. Provide exactly one parent. */ projectId?: string;
  /** Initiative name or ID. Provide exactly one parent. */ initiativeId?: string;
  /** Document ID or slug. Provide exactly one parent. */ documentId?: string;
  /** Milestone UUID. Provide exactly one parent. */ milestoneId?: string;
  /** Status update UUID. Provide exactly one parent. */ statusUpdateId?: string;
  /** Status update type */ statusUpdateType?: "project" | "initiative";
}

type CommentFilter = NonNullable<Parameters<LinearClient["comments"]>[0]>["filter"];

export default withAccessToken(linear)(async (input: Input) => {
  if (input.statusUpdateType && !input.statusUpdateId) {
    throw new Error("statusUpdateType requires statusUpdateId.");
  }
  const parents = [
    input.issueId,
    input.projectId,
    input.initiativeId,
    input.documentId,
    input.milestoneId,
    input.statusUpdateId,
  ].filter(Boolean);
  if (parents.length !== 1) throw new Error("Provide exactly one comment parent.");

  const orderBy = input.orderBy === "createdAt" ? PaginationOrderBy.CreatedAt : PaginationOrderBy.UpdatedAt;
  let result;
  if (input.issueId) {
    const issue = await resolveIssue(input.issueId);
    result = await collect(({ first, after }) => issue.comments({ first, after, orderBy }), input);
  } else if (input.projectId) {
    const project = await resolveProject(input.projectId);
    const filter: CommentFilter = {
      or: [
        { project: { id: { eq: project.id } } },
        ...(project.documentContent ? [{ documentContent: { id: { eq: project.documentContent.id } } }] : []),
      ],
    };
    result = await collect(({ first, after }) => client().comments({ first, after, orderBy, filter }), input);
  } else if (input.initiativeId) {
    const initiative = await resolveInitiative(input.initiativeId);
    const filter: CommentFilter = {
      or: [
        { initiative: { id: { eq: initiative.id } } },
        ...(initiative.documentContent ? [{ documentContent: { id: { eq: initiative.documentContent.id } } }] : []),
      ],
    };
    result = await collect(({ first, after }) => client().comments({ first, after, orderBy, filter }), input);
  } else if (input.documentId) {
    const document = await resolveDocument(input.documentId);
    result = await collect(({ first, after }) => document.comments({ first, after, orderBy }), input);
  } else if (input.milestoneId) {
    const milestone = await client().projectMilestone(input.milestoneId);
    if (!milestone.documentContent) return { nodes: [] };
    result = await collect(
      ({ first, after }) =>
        client().comments({
          first,
          after,
          orderBy,
          filter: { documentContent: { id: { eq: milestone.documentContent!.id } } },
        }),
      input,
    );
  } else {
    const updateId = input.statusUpdateId!;
    if (input.statusUpdateType === "initiative") {
      const update = await client().initiativeUpdate(updateId);
      result = await collect(({ first, after }) => update.comments({ first, after, orderBy }), input);
    } else if (input.statusUpdateType === "project") {
      const update = await client().projectUpdate(updateId);
      result = await collect(({ first, after }) => update.comments({ first, after, orderBy }), input);
    } else {
      const projectUpdate = await tryGet(() => client().projectUpdate(updateId));
      const update = projectUpdate ?? (await client().initiativeUpdate(updateId));
      result = await collect(({ first, after }) => update.comments({ first, after, orderBy }), input);
    }
  }

  return {
    ...result,
    nodes: await Promise.all(result.nodes.map(serializeComment)),
  };
});
