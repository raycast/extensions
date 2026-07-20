import { State } from "@makeplane/plane-node-sdk";
import { planeClient } from "./auth";

export type StateResponse = {
  data: State[];
  hasMore: boolean;
  cursor: string | undefined;
};

export async function getStates({ projectId, cursor }: { projectId: string; cursor?: string }): Promise<StateResponse> {
  const response = await planeClient?.statesApi.listStates({
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
