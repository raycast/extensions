import { Initiative, Project } from "@linear/sdk";
import { withAccessToken } from "@raycast/utils";
import { sortBy } from "lodash";

import { getLinearClient, linear } from "../api/linearClient";

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

export async function getInitiatives() {
  const { graphQLClient } = getLinearClient();
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

export default withAccessToken(linear)(async () => {
  return await getInitiatives();
});
