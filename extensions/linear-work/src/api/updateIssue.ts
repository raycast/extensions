import { Issue } from "@linear/sdk";

import { getLinearClient } from "../api/linearClient";

export type UpdateIssuePayload = {
  title: string;
  description?: string;
  stateId: string;
  labelIds?: string[];
  priority: number;
  teamId?: string;
  dueDate: Date | null | string;
  estimate?: number;
  assigneeId?: string;
  cycleId?: string;
  projectId?: string;
  projectMilestoneId?: string;
  parentId?: string;
};

export async function updateIssue(issueId: Issue["id"], payload: Partial<UpdateIssuePayload>) {
  const { graphQLClient } = getLinearClient();

  const inputParts: string[] = [];

  if (payload.teamId) {
    inputParts.push(`teamId: "${payload.teamId}"`);
  }

  if (payload.title) {
    inputParts.push(`title: "${payload.title.replace(/"/g, "\\$&")}"`);
  }

  if (payload.description) {
    inputParts.push(`description: "${payload.description.replace(/\n/g, "\\n").replace(/"/g, "\\$&")}"`);
  }

  if (payload.stateId) {
    inputParts.push(`stateId: "${payload.stateId}"`);
  }

  if (typeof payload.priority !== "undefined") {
    inputParts.push(`priority: ${payload.priority}`);
  }

  if (typeof payload.assigneeId !== "undefined") {
    inputParts.push(`assigneeId: ${payload.assigneeId ? `"${payload.assigneeId}"` : null}`);
  }

  if (payload.labelIds) {
    inputParts.push(`labelIds: [${payload.labelIds.map((id) => `"${id}"`).join(",")}]`);
  }

  if (typeof payload.estimate !== "undefined") {
    inputParts.push(`estimate: ${payload.estimate}`);
  }

  if (typeof payload.dueDate !== "undefined") {
    const dueDateString = payload.dueDate
      ? payload.dueDate instanceof Date
        ? payload.dueDate.toISOString()
        : payload.dueDate
      : null;
    inputParts.push(`dueDate: ${dueDateString ? `"${dueDateString}"` : null}`);
  }

  if (typeof payload.cycleId !== "undefined") {
    inputParts.push(`cycleId: ${payload.cycleId ? `"${payload.cycleId}"` : null}`);
  }

  if (typeof payload.projectId !== "undefined") {
    inputParts.push(`projectId: ${payload.projectId ? `"${payload.projectId}"` : null}`);
  }

  if (typeof payload.projectMilestoneId !== "undefined") {
    inputParts.push(`projectMilestoneId: ${payload.projectMilestoneId ? `"${payload.projectMilestoneId}"` : null}`);
  }

  if (typeof payload.parentId !== "undefined") {
    inputParts.push(`parentId: ${payload.parentId ? `"${payload.parentId}"` : null}`);
  }

  const { data } = await graphQLClient.rawRequest<{ issueUpdate: { success: boolean } }, Record<string, unknown>>(
    `
      mutation {
        issueUpdate(id: "${issueId}", input: {${inputParts.join(", ")}}) {
          success
        }
      }
    `,
  );

  return { success: data?.issueUpdate.success };
}
