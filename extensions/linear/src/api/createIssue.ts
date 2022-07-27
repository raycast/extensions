import { IssueFragment, IssueResult } from "./getIssues";
import { getLinearClient } from "../helpers/withLinearClient";

export type CreateIssuePayload = {
  title: string;
  description?: string;
  stateId: string;
  labelIds: string[];
  priority: number;
  teamId: string;
  estimate?: number;
  assigneeId?: string;
  cycleId?: string;
  projectId?: string;
  parentId?: string;
  dueDate?: Date;
};

export async function createIssue(payload: CreateIssuePayload) {
  const { graphQLClient } = getLinearClient();

  const title = payload.title.replace(/"/g, "\\$&");
  const description = payload.description?.replace(/\n/g, "\\n").replace(/"/g, "\\$&");

  let issueCreateInput = `teamId: "${payload.teamId}", title: "${title}", description: "${description}", priority: ${payload.priority}, stateId: "${payload.stateId}"`;

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
    `
  );

  return { success: data?.issueCreate.success, issue: data?.issueCreate.issue };
}
