import { Cluster, DescribeClustersCommand, ECSClient, ListClustersCommand } from "@aws-sdk/client-ecs";
import { ActionPanel, List, Action, Icon } from "@raycast/api";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";
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

function ECSCluster(props: { cluster: Cluster }) {
  const cluster = props.cluster;
  const name = cluster.clusterName;

  const subtitle = useMemo(() => {
    switch (cluster.status || "INACTIVE") {
      case "ACTIVE":
        return "🟢 " + (cluster.status || "");
      case "PROVISIONING":
        return "⬆️ " + (cluster.status || "");
      case "DEPROVISIONING":
        return "⬇️ " + (cluster.status || "");
      case "INACTIVE":
        return "⚫ " + (cluster.status || "");
      case "FAILED":
        return "🔴 " + (cluster.status || "");
      default:
        return "⚫";
    }
  }, [cluster]);

  return (
    <List.Item
      id={cluster.clusterArn}
      key={cluster.clusterArn}
      title={name || "Unknown ECS name"}
      subtitle={subtitle}
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
        </ActionPanel>
      }
      accessories={[
        {
          icon: "⚙️",
          text: (cluster.activeServicesCount || 0).toString(),
          tooltip: "Active Services Count",
        },
        {
          icon: "⏰",
          text: (cluster.pendingTasksCount || 0).toString(),
          tooltip: "Pending Tasks Count",
        },
        {
          icon: "⚡",
          text: (cluster.runningTasksCount || 0).toString(),
          tooltip: "Running Tasks Count",
        },
      ]}
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
