import { ProjectMilestone } from "@linear/sdk";

import { getLinearClient } from "../api/linearClient";

export type MilestoneResult = Pick<
  ProjectMilestone,
  "id" | "name" | "description" | "targetDate" | "archivedAt" | "createdAt" | "updatedAt"
> & {
  // Linear doesn't seem to expose the startDate property even though we can retrieve it
  startDate?: string;
} & {
  project: { nodes: { id: string; key: string }[] };
};

const milestoneFragment = `
  id
  name
  targetDate
  project {
      id
  }
  sortOrder
  updatedAt
`;

export async function getMilestones(projectId?: string) {
  const { graphQLClient } = getLinearClient();

  if (projectId) {
    const { data } = await graphQLClient.rawRequest<
      { project: { projectMilestones: { nodes: MilestoneResult[] } } },
      Record<string, unknown>
    >(
      `
        query($projectId: String!) {
          project(id: $projectId) {
            projectMilestones {
              nodes {
                ${milestoneFragment}
              }
            }
          }
        }
      `,
      { projectId },
    );

    return data?.project.projectMilestones.nodes;
  }
  return null;
}
