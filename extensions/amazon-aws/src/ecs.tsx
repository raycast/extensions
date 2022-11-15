import { getPreferenceValues, ActionPanel, List, Detail, Action } from "@raycast/api";
import AWS from "aws-sdk";
import setupAws from "./util/setupAws";
import { Preferences } from "./types";
import { useCachedPromise } from "@raycast/utils";
import { useMemo } from "react";

setupAws();
const ecs = new AWS.ECS({ apiVersion: "2016-11-15" });

export default function DescribeECSClusters() {
  const { data: clusters, error, isLoading } = useCachedPromise(fetchClusters);

  if (error) {
    return (
      <Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={isLoading} searchBarPlaceholder="Filter instances by name...">
      {clusters?.map((c) => (
        <ClusterListItem key={c.clusterArn} cluster={c} />
      ))}
    </List>
  );
}

function ClusterListItem(props: { cluster: AWS.ECS.Cluster }) {
  const cluster = props.cluster;
  const name = cluster.clusterName;
  const preferences = getPreferenceValues<Preferences>();

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
      icon="list-icon.png"
      actions={
        <ActionPanel>
          <Action.OpenInBrowser
            title="Open in Browser"
            url={
              "https://" +
              preferences.region +
              ".console.aws.amazon.com/ecs/home?region=" +
              preferences.region +
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
  const { clusterArns, nextToken } = await ecs.listClusters({ nextToken: token }).promise();
  const combinedClusters = [...(accClusters || []), ...(clusterArns || [])];

  if (nextToken) {
    return fetchArns(nextToken, combinedClusters);
  }

  return combinedClusters;
}

async function fetchClusters(): Promise<AWS.ECS.Cluster[]> {
  const clustersArns = await fetchArns();

  const { clusters } = await ecs.describeClusters({ clusters: clustersArns }).promise();
  return [...(clusters || [])];
}
