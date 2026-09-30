import { getLinearClient } from "../api/linearClient";

import { IssueFragment, IssueResult } from "./getIssues";

export type CreateIssuePayload = {
  title: string;
  description?: string;
  stateId?: string;
  labelIds?: string[];
  priority: number;
  teamId: string;
  dueDate: Date | null;
  estimate?: number;
  assigneeId?: string;
  cycleId?: string;
  projectId?: string;
  projectMilestoneId?: string;
  parentId?: string;
};

export async function createIssue(payload: CreateIssuePayload) {
  const { graphQLClient } = getLinearClient();

  const title = payload.title.replace(/"/g, "\\$&");
  const description = payload.description?.replace(/\n/g, "\\n")?.replace(/"/g, "\\$&");

  let issueCreateInput = `teamId: "${payload.teamId}", title: "${title}", description: "${description}", priority: ${payload.priority}`;

  if (payload.stateId) {
    issueCreateInput += `, stateId: "${payload.stateId}"`;
  }

  if (payload.estimate) {
    issueCreateInput += `, estimate: ${payload.estimate}`;
  }

  if (payload.assigneeId) {
    issueCreateInput += `, assigneeId: "${payload.assigneeId}"`;
  }

  if (payload.labelIds && payload.labelIds.length > 0) {
    issueCreateInput += `, labelIds: [${payload.labelIds.map((id) => `"${id}"`).join(",")}]`;
  }

  if (payload.dueDate) {
    issueCreateInput += `, dueDate: "${payload.dueDate.toISOString()}"`;
  }

  if (payload.cycleId) {
    issueCreateInput += `, cycleId: "${payload.cycleId}"`;
  }

  if (payload.projectId) {
    issueCreateInput += `, projectId: "${payload.projectId}"`;
  }

  if (payload.projectId && payload.projectMilestoneId) {
    issueCreateInput += `, projectMilestoneId: "${payload.projectMilestoneId}"`;
  }

  if (payload.parentId) {
    issueCreateInput += `, parentId: "${payload.parentId}"`;
  }

  const { data } = await graphQLClient.rawRequest<
    { issueCreate: { success: boolean; issue: IssueResult } },
    Record<string, unknown>
  >(
    `
      mutation {
        issueCreate(input: {${issueCreateInput}}) {
          success
          issue {
            ${IssueFragment}
          }
        }
      }
    `,
  );

  return { success: data?.issueCreate.success, issue: data?.issueCreate.issue };
}

type CreateSubIssuePayload = {
  teamId: string;
  title: string;
  description?: string;
  parentId: string;
  stateId?: string;
};

export async function createSubIssue(payload: CreateSubIssuePayload) {
  const { graphQLClient } = getLinearClient();

  const title = payload.title.replace(/"/g, "\\$&");
  const description = payload.description?.replace(/\n/g, "\\n").replace(/"/g, "\\$&");

  let issueCreateInput = `teamId: "${payload.teamId}", title: "${title}", description: "${description}", parentId: "${payload.parentId}"`;

  if (payload.stateId) {
    issueCreateInput += `, stateId: "${payload.stateId}"`;
  }

  const { data } = await graphQLClient.rawRequest<{ issueCreate: { success: boolean } }, Record<string, unknown>>(
    `
      mutation {
        issueCreate(input: {${issueCreateInput}}) {
          success
        }
      }
    `,
  );

  return { success: data?.issueCreate.success };
}
