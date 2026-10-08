import { Label } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

export type LabelResponse = {
  data: Label[];
  hasMore: boolean;
  cursor: string | undefined;
};

export async function getLabels({ projectId, cursor }: { projectId: string; cursor?: string }): Promise<LabelResponse> {
  const response = await planeClient?.labelsApi.listLabels({
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
