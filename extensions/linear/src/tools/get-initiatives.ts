import { Initiative, LinearClient, Project } from "@linear/sdk";
import { sortBy } from "lodash";

import { resolveClient } from "../api/linearClient";

import { resolveToolClient, withToolAuth } from "./resolveToolWorkspace";

export type InitiativeResult = Pick<Initiative, "id" | "name" | "color" | "icon" | "sortOrder" | "description"> & {
  projects?: { nodes: Pick<Project, "id">[] };
};

type InitiativeList = { initiatives: { nodes: InitiativeResult[] } };

const initiativeFragment = `
  id
  name
  color
  icon
  description
  sortOrder
  projects {
    nodes {
      id
    }
  }
`;

export async function getInitiatives(client?: LinearClient) {
  const { graphQLClient } = resolveClient(client);
  const { data } = await graphQLClient.rawRequest<InitiativeList, Record<string, unknown>>(
    `
      query {
        initiatives(orderBy: updatedAt) {
          nodes {
            ${initiativeFragment}
          }
        }
      }
    `,
  );

  return sortBy(data?.initiatives.nodes ?? [], (i) => i.sortOrder ?? Infinity);
}

type Input = {
  /** The workspace to act in: a workspaceId value returned by the get-workspaces tool. Omit to use the active workspace. */
  workspaceId?: string;
};

export default withToolAuth(async ({ workspaceId }: Input) => {
  const client = await resolveToolClient(workspaceId);
  return await getInitiatives(client);
});
