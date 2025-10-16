import { ProjectUpdate } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

export type ProjectUpdateResult = Pick<ProjectUpdate, "id" | "health" | "body" | "updatedAt" | "url">;

export default withAccessToken(linear)(async ({
  projectId,
}: {
  /** The ID of the project to fetch the updates for. Use the 'get-projects' tool to get the project ID. */
  projectId: string;
}) => {
  const { linearClient } = getLinearClient();

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
});
