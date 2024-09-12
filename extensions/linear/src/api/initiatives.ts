import { Initiative } from "@linear/sdk";
import { getLinearClient } from "./linearClient";
import { sortBy } from "lodash";

export type InitiativeResult = Pick<Initiative, "id" | "name" | "color" | "icon" | "sortOrder" | "description">;

const initiativeFragment = `
  id
  name
  color
  icon
  description
  sortOrder
`;

export async function getInitiatives() {
  const { graphQLClient } = getLinearClient();
  const { data } = await graphQLClient.rawRequest<
    { initiatives: { nodes: InitiativeResult[] } },
    Record<string, unknown>
  >(
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
