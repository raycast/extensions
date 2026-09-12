import { Module, ModuleIssue } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

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
