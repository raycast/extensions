import { ProjectUpdate } from "@linear/sdk";

import { resolveClient } from "../api/linearClient";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

export type ProjectUpdateResult = Pick<ProjectUpdate, "id" | "health" | "body" | "updatedAt" | "url">;

export default withToolAuth(
  async ({
    projectId,
    workspaceId,
  }: {
    /** The ID of the project to fetch the updates for. Use the 'get-projects' tool to get the project ID. */
    projectId: string;

    /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
    workspaceId?: string;
  }) => {
    const client = await resolveToolClient(workspaceId);
    const { linearClient } = resolveClient(client);

    const allUpdates: ProjectUpdateResult[] = [];
    let hasNextPage = true;
    let endCursor = null;

    while (hasNextPage) {
      const projectUpdates = await linearClient.projectUpdates({
        filter: {
          project: { id: { eq: projectId } },
        },
        after: endCursor,
        first: 100, // Fetch 100 updates at a time
      });
      allUpdates.push(
        ...projectUpdates.nodes.map((update) => ({
          id: update.id,
          health: update.health,
          body: update.body,
          updatedAt: update.updatedAt,
          url: update.url,
        })),
      );
      hasNextPage = projectUpdates.pageInfo.hasNextPage;
      endCursor = projectUpdates.pageInfo.endCursor;
    }

    return allUpdates;
  },
);
