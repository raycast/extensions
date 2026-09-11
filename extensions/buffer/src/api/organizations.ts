import { gql } from "./client";
import type { Organization } from "./types";

const GET_ORGANIZATIONS = `
  query GetOrganizations {
    account {
      organizations {
        id
        name
      }
    }
  }
`;

export async function getOrganizations(): Promise<Organization[]> {
  const data = await gql<{ account: { organizations: Organization[] } }>(
    GET_ORGANIZATIONS,
  );
  return data.account.organizations;
}
