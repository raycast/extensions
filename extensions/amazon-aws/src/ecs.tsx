import { getPreferenceValues, ActionPanel, List, Detail, Action, Icon } from "@raycast/api";
import { useState, useEffect, useMemo } from "react";
import AWS from "aws-sdk";
import setupAws from "./util/setupAws";

setupAws();

interface Preferences {
  region: string;
}

export default function DescribeECSClusters() {
  const ecs = new AWS.ECS({ apiVersion: "2016-11-15" });

  const [state, setState] = useState<{ clusters?: AWS.ECS.Clusters; loaded: boolean; hasError: boolean }>({
    clusters: undefined,
    loaded: false,
    hasError: false,
  });

  useEffect(() => {
    async function fetchArns(token?: string, accClusters?: string[]): Promise<string[]> {
      const { clusterArns, nextToken } = await ecs.listClusters({ nextToken: token }).promise();
      const combinedClusters = [...(accClusters || []), ...(clusterArns || [])];

      if (nextToken) {
        return fetchArns(nextToken, combinedClusters);
      }

      return combinedClusters;
    }

    async function fetchClusters(arns: string[]): Promise<AWS.ECS.Cluster[]> {
      const { clusters } = await ecs.describeClusters({ clusters: arns }).promise();
      return [...(clusters || [])];
    }

    fetchArns()
      .then((clustersArns) => {
        fetchClusters(clustersArns).then((clusters) => setState({ clusters, loaded: true, hasError: false }));
      })
      .catch(() => setState({ clusters: undefined, loaded: true, hasError: true }));
  }, []);

  if (state.hasError) {
    return (
      <Detail markdown="No valid [configuration and credential file] (https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) found in your machine." />
    );
  }

  return (
    <List isLoading={!state.loaded} searchBarPlaceholder="Filter instances by name...">
      {state.clusters && state.clusters.map((c) => <ClusterListItem key={c.clusterArn} cluster={c} />)}
    </List>
  );
}

function ClusterListItem(props: { cluster: AWS.ECS.Cluster }) {
  const cluster = props.cluster;
  const name = cluster.clusterName;
  const preferences: Preferences = getPreferenceValues();

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
