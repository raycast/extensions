import { Issue, IssueFromJSON, IssueSearchItem, IssueRequest, PatchedIssueRequest } from "@makeplane/plane-node-sdk";
import { planeClient, requirePlaneClient } from "./auth";
import { planeRequest, toPage, workspacePath } from "./request";
import type { RawLabelLite, RawPaginated, RawUserLite, RawWorkItem, WorkItemSummary } from "./types";
import {
  getAssigneeIds,
  getExpandedAssignees,
  getExpandedLabels,
  getLabelIds,
  toWorkItemSummary,
} from "../helpers/work-item-summary";

export async function createWorkItem(projectId: string, workItemRequest: IssueRequest) {
  const response = await planeClient?.workItemsApi.createWorkItem({
    projectId,
    slug: planeClient?.workspaceSlug,
    issueRequest: workItemRequest,
  });
  return response;
}

/** Work item from the SDK model, plus the assignee/label fields SDK 0.1.3 drops. */
export type WorkItemDetailData = Issue & {
  assignees: string[];
  labels: string[];
  assigneeDetails: RawUserLite[];
  labelDetails: RawLabelLite[];
};

export async function getWorkItem(workItemId: string, projectId: string): Promise<WorkItemDetailData> {
  const raw = await planeRequest<RawWorkItem>(workspacePath("projects", projectId, "work-items", workItemId), {
    query: { expand: "assignees,labels" },
  });
  return {
    ...IssueFromJSON(raw),
    assignees: getAssigneeIds(raw),
    labels: getLabelIds(raw),
    assigneeDetails: getExpandedAssignees(raw),
    labelDetails: getExpandedLabels(raw),
  };
}

export async function listProjectWorkItemsRaw({
  projectId,
  cursor,
  perPage = 100,
  orderBy,
  expand,
  fields,
}: {
  projectId: string;
  cursor?: string;
  perPage?: number;
  orderBy?: string;
  expand?: string;
  fields?: string;
}): Promise<RawPaginated<RawWorkItem>> {
  return planeRequest<RawPaginated<RawWorkItem>>(workspacePath("projects", projectId, "work-items"), {
    query: { per_page: perPage, cursor, order_by: orderBy, expand, fields },
  });
}

export async function getProjectWorkItems({
  project,
  perPage = 50,
  cursor,
}: {
  project: { id: string; identifier: string; name?: string };
  perPage?: number;
  cursor?: string;
}) {
  const client = requirePlaneClient();
  const response = await listProjectWorkItemsRaw({
    projectId: project.id,
    perPage,
    cursor,
    orderBy: "-updated_at",
    expand: "state",
  });
  return toPage(response, (raw) =>
    toWorkItemSummary(raw, {
      projectIdentifier: project.identifier,
      projectName: project.name,
      workspaceSlug: client.workspaceSlug,
    }),
  );
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

export function searchItemToSummary(item: IssueSearchItem): WorkItemSummary {
  return {
    id: item.id,
    name: item.name,
    projectId: item.projectId,
    projectIdentifier: item.projectIdentifier,
    sequenceId: item.sequenceId,
    workspaceSlug: item.workspaceSlug,
  };
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
