import { Issue } from "@linear/sdk";

import { getLinearClient } from "../helpers/withLinearClient";

export type UpdateIssuePayload = {
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

export async function updateIssue(issueId: Issue["id"], payload: UpdateIssuePayload) {
  const { graphQLClient } = getLinearClient();

  const title = payload.title.replace(/"/g, "\\$&");
  const description = payload.description?.replace(/\n/g, "\\n").replace(/"/g, "\\$&");

  let issueUpdateInput = `teamId: "${payload.teamId}"`;
  issueUpdateInput += `, title: "${title}"`;
  issueUpdateInput += `, description: "${description}"`;
  issueUpdateInput += `, stateId: "${payload.stateId}"`;
  issueUpdateInput += `, priority: ${payload.priority}`;
  issueUpdateInput += `, assigneeId: ${payload.assigneeId ? `"${payload.assigneeId}"` : null}`;
  issueUpdateInput += `, labelIds: [${payload.labelIds.map((id) => `"${id}"`).join(",")}]`;
  issueUpdateInput += `, estimate: ${payload.estimate ? payload.estimate : null}`;
  issueUpdateInput += `, dueDate: ${payload.dueDate ? `"${payload.dueDate.toISOString()}"` : null}`;
  issueUpdateInput += `, cycleId: ${payload.cycleId ? `"${payload.cycleId}"` : null}`;
  issueUpdateInput += `, projectId: ${payload.projectId ? `"${payload.projectId}"` : null}`;
  issueUpdateInput += `, parentId: ${payload.parentId ? `"${payload.parentId}"` : null}`;

  const { data } = await graphQLClient.rawRequest<{ issueUpdate: { success: boolean } }, Record<string, unknown>>(
    `
      mutation {
        issueUpdate(id: "${issueId}", input: {${issueUpdateInput}}) {
          success
        }
      }
    `
  );

  return { success: data?.issueUpdate.success };
}
