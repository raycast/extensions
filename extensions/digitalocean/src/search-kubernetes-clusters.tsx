import { useKubernetesClusters } from "./client";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import KubernetesClusterDetail from "./details/KubernetesClusterDetail";

export default function Command() {
  const { data, error, isLoading } = useKubernetesClusters();

  if (error) {
    return <Detail markdown={`${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {data?.kubernetes_clusters?.map((cluster) => (
        <List.Item
          key={cluster.id}
          title={cluster.name}
          subtitle={cluster.region}
          actions={
            <ActionPanel>
              <Action.Push title="View Details" target={<KubernetesClusterDetail cluster={cluster} />} />
              <Action.OpenInBrowser url={`https://cloud.digitalocean.com/kubernetes/clusters/${cluster.id}`} />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
