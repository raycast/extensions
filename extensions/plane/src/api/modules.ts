import { Module, ModuleIssue } from "@makeplane/plane-node-sdk";
import { planeClient, requirePlaneClient } from "./auth";
import { planeRequest, toPage, workspacePath } from "./request";
import type { RawPaginated, RawWorkItem } from "./types";
import { toWorkItemSummary } from "../helpers/work-item-summary";

export type ModuleResponse = {
  data: Module[];
  hasMore: boolean;
  cursor: string | undefined;
};

export async function getModules({
  projectId,
  cursor,
}: {
  projectId: string;
  cursor?: string;
}): Promise<ModuleResponse> {
  const response = await planeClient?.modulesApi.listModules({
    projectId,
    slug: planeClient?.workspaceSlug,
    perPage: 100,
    cursor,
  });
  return {
    data: response?.results || [],
    hasMore: response?.nextCursor ? true : false,
    cursor: response?.nextCursor,
  };
}

export async function addWorkItemsToModule({
  projectId,
  moduleId,
  workItemIds,
}: {
  projectId: string;
  moduleId: string;
  workItemIds: string[];
}): Promise<ModuleIssue | undefined> {
  const response = await planeClient?.modulesApi.addModuleWorkItems({
    slug: planeClient?.workspaceSlug,
    projectId,
    moduleId,
    moduleIssueRequestRequest: {
      issues: workItemIds,
    },
  });
  return response;
}

/** Work items in a module. v1.3.1 returns full work items here (the SDK types them as ModuleIssue). */
export async function getModuleWorkItems({
  project,
  moduleId,
  cursor,
}: {
  project: { id: string; identifier: string; name?: string };
  moduleId: string;
  cursor?: string;
}) {
  const client = requirePlaneClient();
  const response = await planeRequest<RawPaginated<RawWorkItem>>(
    workspacePath("projects", project.id, "modules", moduleId, "module-issues"),
    { query: { per_page: 100, cursor, expand: "state" } },
  );
  return toPage(response, (raw) =>
    toWorkItemSummary(raw, {
      projectIdentifier: project.identifier,
      projectName: project.name,
      workspaceSlug: client.workspaceSlug,
    }),
  );
}
