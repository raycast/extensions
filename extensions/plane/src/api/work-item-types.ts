import { IssueTypeAPI as WorkItemType } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

export async function getWorkItemTypes({ projectId }: { projectId: string }): Promise<WorkItemType[] | undefined> {
  const response = await planeClient?.workItemTypesApi.listIssueTypes({ projectId, slug: planeClient?.workspaceSlug });
  return response;
}
