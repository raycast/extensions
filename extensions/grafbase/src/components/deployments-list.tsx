import { Action, ActionPanel, Icon, Image, List, getPreferenceValues } from "@raycast/api";
import { useFetch } from "@raycast/utils";
import { formatDistanceToNowStrict } from "date-fns";
import { useState } from "react";

import { GetDeploymentsForBranchQuery } from "../gql/graphql";
import { useGrafbase } from "../hooks/use-grafbase";
import { BranchesDropdown } from "./branches-dropdown";
import { DeploymentStatusIcon } from "./deployment-status-icon";

export const GetDeploymentsForBranchDocument = /* GraphQL */ `
  query GetDeploymentsForBranch($name: String!, $accountSlug: String!, $projectSlug: String!) {
    branch(name: $name, accountSlug: $accountSlug, projectSlug: $projectSlug) {
      deployments(last: 6) {
        edges {
          cursor
          node {
            id
            status
            createdAt
            commit {
              message
              author
              authorAvatarUrl
            }
          }
        }
      }
    }
  }
`;

const { webUrl, apiUrl, accessToken } = getPreferenceValues();

export function DeploymentsList({ projectSlug }: { projectSlug: string }) {
  const { activeSlug } = useGrafbase();
  const [activeBranch, setActiveBranch] = useState("main");

  const { isLoading, data, revalidate } = useFetch<{ data: GetDeploymentsForBranchQuery }>(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      query: GetDeploymentsForBranchDocument,
      variables: {
        name: activeBranch,
        accountSlug: activeSlug,
        projectSlug,
      },
    }),
  });

  const handleBranchChange = async (name: string) => {
    await setActiveBranch(name);
    revalidate();
  };

  const deployments = data?.data?.branch?.deployments?.edges;

  return (
    <List
      navigationTitle="Deployments"
      isLoading={isLoading}
      searchBarAccessory={
        <BranchesDropdown projectSlug={projectSlug} current={activeBranch} onChange={handleBranchChange} />
      }
    >
      {!deployments || deployments?.length === 0 ? (
        <List.EmptyView
          icon={Icon.Tree}
          title="No deployments yet"
          description="Push your project schema to get started."
        />
      ) : (
        deployments.map(({ node, cursor }) => (
          <List.Item
            key={cursor}
            id={node.id}
            title={node.commit?.message || "<empty>"}
            icon={DeploymentStatusIcon(node.status)}
            accessories={[
              {
                text: node.commit?.author,
                icon: {
                  fallback: Icon.Person,
                  source: node?.commit?.authorAvatarUrl as string,
                  mask: Image.Mask.RoundedRectangle,
                },
              },
              {
                text: node.createdAt
                  ? formatDistanceToNowStrict(new Date(node.createdAt), {
                      addSuffix: true,
                    })
                  : "never",
                tooltip: node.createdAt ? new Date(node.createdAt).toString().replace(/ \(.*\)/, "") : "",
              },
            ]}
            actions={
              <ActionPanel>
                <Action.OpenInBrowser
                  title="Open Deployment in Grafbase"
                  url={`${webUrl}/${activeSlug}/${projectSlug}/${activeBranch}/${node.id}`}
                ></Action.OpenInBrowser>
              </ActionPanel>
            }
          />
        ))
      )}
    </List>
  );
}
