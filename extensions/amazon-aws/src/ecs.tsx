import { Cluster, DescribeClustersCommand, ECSClient, ListClustersCommand } from "@aws-sdk/client-ecs";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import AWSProfileDropdown from "./util/aws-profile-dropdown";

export default function ECS() {
  const { data: clusters, error, isLoading, revalidate } = useCachedPromise(fetchClusters);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Filter instances by name..."
      searchBarAccessory={<AWSProfileDropdown onProfileSelected={revalidate} />}
    >
      {error ? (
        <List.EmptyView title={error.name} description={error.message} icon={Icon.Warning} />
      ) : (
        clusters?.map((c) => <ECSCluster key={c.clusterArn} cluster={c} />)
      )}
    </List>
  );
}

function ECSCluster({ cluster }: { cluster: Cluster }) {
  return (
    <List.Item
      id={cluster.clusterArn}
      key={cluster.clusterArn}
      title={cluster.clusterName || "Unknown ECS name"}
      icon={Icon.Box}
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://" +
              process.env.AWS_REGION +
              ".console.aws.amazon.com/ecs/home?region=" +
              process.env.AWS_REGION +
              "#clusters/" +
              cluster.clusterName
            }
          />
          <Action.CopyToClipboard title="Copy Cluster ARN" content={cluster.clusterArn || ""} />
        </ActionPanel>
      }
      accessories={[{ text: cluster.status }]}
    />
  );
}

async function fetchArns(token?: string, accClusters?: string[]): Promise<string[]> {
  const { clusterArns, nextToken } = await new ECSClient({}).send(new ListClustersCommand({ nextToken: token }));
  const combinedClusters = [...(accClusters || []), ...(clusterArns || [])];

  if (nextToken) {
    return fetchArns(nextToken, combinedClusters);
  }

  return combinedClusters;
}

async function fetchClusters(): Promise<Cluster[]> {
  const clustersArns = await fetchArns();

  const { clusters } = await new ECSClient({}).send(new DescribeClustersCommand({ clusters: clustersArns }));
  return [...(clusters || [])];
}
