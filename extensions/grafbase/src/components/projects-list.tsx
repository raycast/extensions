import { Action, ActionPanel, Icon, List, getPreferenceValues, useNavigation } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { formatDistanceToNowStrict } from "date-fns";

import { GetProjectsByAccountSlugQuery } from "../gql/graphql";
import { useGrafbase } from "../hooks/use-grafbase";
import { DeploymentsList } from "./deployments-list";
import { ScopeDropdown } from "./scope-dropdown";

const { webUrl, apiUrl, accessToken } = getPreferenceValues();

export const GetProjectsByAccountSlugDocument = /* GraphQL */ `
  query GetProjectsByAccountSlug($slug: String!) {
    accountBySlug(slug: $slug) {
      projects {
        edges {
          cursor
          node {
            id
            slug
            repository {
              url
            }
            productionBranch {
              name
              domains
              activeDeployment {
                id
                createdAt
              }
              latestDeployment {
                id
                createdAt
              }
            }
          }
        }
      }
    }
  }
`;

export default function ProjectsList() {
  const { activeSlug, personalAccount, organizationMemberships } = useGrafbase();

  const { isLoading, data, revalidate } = useFetch<{ data: GetProjectsByAccountSlugQuery }>(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: GetProjectsByAccountSlugDocument,
      variables: {
        slug: activeSlug,
      },
    }),
  });

  const projects = data?.data?.accountBySlug?.projects?.edges;

  const { push } = useNavigation();

  return (
    <List
      navigationTitle="Projects"
      searchBarPlaceholder="Search Projects..."
      isLoading={isLoading}
      searchBarAccessory={
        (personalAccount || organizationMemberships) && <ScopeDropdown onChange={() => revalidate()} />
      }
    >
      {!projects || projects?.length === 0 ? (
        <List.EmptyView
          icon={Icon.List}
          title="No projects yet"
          description="Choose one of our templates or import one to get started."
        />
      ) : (
        projects.map(({ node, cursor }) => (
          <List.Item
            key={cursor}
            id={node.id}
            title={node.slug}
            accessories={[
              {
                text: node.productionBranch.activeDeployment
                  ? formatDistanceToNowStrict(new Date(node.productionBranch.activeDeployment.createdAt), {
                      addSuffix: true,
                    })
                  : "never",
                tooltip: node.productionBranch.activeDeployment
                  ? new Date(node.productionBranch.activeDeployment.createdAt).toString().replace(/ \(.*\)/, "")
                  : "",
              },
            ]}
            actions={
              <ActionPanel>
                <Action
                  title="View Branches"
                  icon={Icon.MagnifyingGlass}
                  onAction={() => push(<DeploymentsList projectSlug={node.slug} />)}
                />
                <Action.OpenInBrowser
                  icon={Icon.AppWindow}
                  title="Open in Grafbase Dashboard"
                  url={`${webUrl}/${activeSlug}/${node.slug}`}
                />
                <Action.OpenInBrowser
                  icon={Icon.ArrowRight}
                  title="Show Latest Deployment"
                  url={`${webUrl}/${activeSlug}/${node.slug}/${node.productionBranch.name}/${node.productionBranch.latestDeployment?.id}`}
                />
                <Action.OpenInBrowser
                  icon={Icon.Code}
                  title="Open in GitHub"
                  url={`${node?.repository?.url}/tree/${node.productionBranch.name}`}
                />
                <Action.CopyToClipboard
                  title="Copy GraphQL Endpoint"
                  content={`https://${node.productionBranch.domains[0]}/graphql`}
                />
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
