import { Icon, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";

import { GetProjectBranchesQuery } from "../gql/graphql";
import { useGrafbase } from "../hooks/use-grafbase";

export const GetProjectBranchesDocument = /* GraphQL */ `
  query GetProjectBranches($accountSlug: String!, $projectSlug: String!) {
    projectByAccountSlug(accountSlug: $accountSlug, projectSlug: $projectSlug) {
      branches(last: 6) {
        edges {
          node {
            id
            name
            activeDeployment {
              createdAt
            }
          }
        }
      }
    }
  }
`;

const { apiUrl, accessToken } = getPreferenceValues();

// Todo use generated types
type BranchesDropdownProps = {
  projectSlug: string;
  current: string;
  onChange: any;
};

export function BranchesDropdown({ projectSlug, current, onChange }: BranchesDropdownProps) {
  const { activeSlug } = useGrafbase();

  const { isLoading, data } = useFetch<{ data: GetProjectBranchesQuery }>(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: GetProjectBranchesDocument,
      variables: {
        accountSlug: activeSlug,
        projectSlug,
      },
    }),
  });

  const branches = data?.data?.projectByAccountSlug?.branches?.edges;

  return (
    <List.Dropdown
      tooltip="Switch scope"
      isLoading={isLoading}
      onChange={(newValue) => onChange(newValue)}
      value={current}
    >
      {branches?.map(({ node }) => (
        <List.Dropdown.Item
          key={node?.id}
          value={node?.name}
          title={node?.name}
          icon={node?.name === "main" ? Icon.Crown : null}
        />
      ))}
    </List.Dropdown>
  );
}
