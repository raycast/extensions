import { Project } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";

import { getLinearClient, linear } from "../api/linearClient";

export type ProjectResult = Pick<
  Project,
  "id" | "description" | "name" | "content" | "progress" | "targetDate" | "startDate"
>;

export default withAccessToken(linear)(async () => {
  const { linearClient } = getLinearClient();

  const allProjects: ProjectResult[] = [];
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const projects = await linearClient.projects({
      after: endCursor,
      first: 100,
    });
    allProjects.push(
      ...projects.nodes.map((project) => ({
        id: project.id,
        name: project.name,
        description: project.description,
        content: project.content,
        progress: project.progress,
        targetDate: project.targetDate,
        startDate: project.startDate,
      })),
    );
    hasNextPage = projects.pageInfo.hasNextPage;
    endCursor = projects.pageInfo.endCursor;
  }

  return allProjects;
});
