import { Project } from "@linear/sdk";

import { resolveClient } from "../api/linearClient";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

export type ProjectResult = Pick<
  Project,
  "id" | "description" | "name" | "content" | "progress" | "targetDate" | "startDate"
>;

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  const { linearClient } = resolveClient(client);

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
