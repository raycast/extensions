import { IssueSearchItem, IssueRequest, PatchedIssueRequest } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

export async function createWorkItem(projectId: string, workItemRequest: IssueRequest) {
  const response = await planeClient?.workItemsApi.createWorkItem({
    projectId,
    slug: planeClient?.workspaceSlug,
    issueRequest: workItemRequest,
  });
  return response;
}

export async function getWorkItem(workItemId: string, projectId: string) {
  const response = await planeClient?.workItemsApi.retrieveWorkItem({
    pk: workItemId,
    projectId,
    slug: planeClient?.workspaceSlug,
  });
  return response;
}

export async function searchWorkItems({
  searchText,
  projectId,
  limit = 100,
  workspaceSearch = false,
}: {
  searchText: string;
  projectId?: string;
  limit?: number;
  workspaceSearch?: boolean;
}): Promise<IssueSearchItem[]> {
  const response = await planeClient?.workItemsApi.searchWorkItems({
    slug: planeClient?.workspaceSlug,
    search: searchText,
    projectId,
    limit,
    workspaceSearch: workspaceSearch ? "true" : undefined,
  });

  return response?.issues || [];
}

export async function updateWorkItem({
  workItemId,
  projectId,
  patchWorkItemRequest,
}: {
  workItemId: string;
  projectId: string;
  patchWorkItemRequest: PatchedIssueRequest;
}) {
  const response = await planeClient?.workItemsApi.updateWorkItem({
    pk: workItemId,
    projectId,
    slug: planeClient?.workspaceSlug,
    patchedIssueRequest: patchWorkItemRequest,
  });
  return response;
}
