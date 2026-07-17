import { useKubernetesClusters } from "./client";
import { Action, ActionPanel, Detail, List } from "@raycast/api";
import KubernetesClusterDetail from "./details/KubernetesClusterDetail";
import { DO } from "./config";

export default function Command() {
  const { data, error, isLoading } = useKubernetesClusters();
  const kubernetes_clusters = data?.kubernetes_clusters || [];

  if (error) {
    return <Detail markdown={`${error.message}`} />;
  }

  return (
    <List isLoading={isLoading}>
      {!isLoading && !kubernetes_clusters.length && (
        <List.EmptyView
          icon={DO.LOGO}
          title="Business-ready Kubernetes"
          description="Create your first Kubernetes Cluster now"
          actions={
            <ActionPanel>
              <Action.OpenInBrowser
                icon={DO.ICON}
                title="Create Kubernetes Cluster"
                url={DO.LINKS.kubernetes.clusters.new}
              />
            </ActionPanel>
          }
        />
      )}
      {kubernetes_clusters.map((cluster) => (
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
