import { Cycle, CycleIssue } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

export type CycleResponse = {
  data: Cycle[];
  hasMore: boolean;
  cursor: string | undefined;
};

export async function getCycles({ projectId, cursor }: { projectId: string; cursor?: string }): Promise<CycleResponse> {
  const response = await planeClient?.cyclesApi.listCycles({
    projectId,
    slug: planeClient?.workspaceSlug,
    perPage: 100,
    cursor,
  });
  return {
    data: response?.results || [],
    hasMore: !!response?.nextCursor,
    cursor: response?.nextCursor,
  };
}

export async function addWorkItemsToCycle({
  projectId,
  cycleId,
  workItemIds,
}: {
  projectId: string;
  cycleId: string;
  workItemIds: string[];
}): Promise<CycleIssue | undefined> {
  const response = await planeClient?.cyclesApi.addCycleWorkItems({
    slug: planeClient?.workspaceSlug,
    projectId,
    cycleId,
    cycleIssueRequestRequest: {
      issues: workItemIds,
    },
  });
  return response;
}
