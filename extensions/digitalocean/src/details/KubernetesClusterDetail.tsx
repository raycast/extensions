import { Action, ActionPanel, Detail } from "@raycast/api";
import { type KubernetesCluster } from "../client";

export default function KubernetesClusterDetail({ cluster }: { cluster: KubernetesCluster }) {
  return (
    <Detail
      actions={
        <ActionPanel>
          <Action.CopyToClipboard
            content={`doctl kubernetes cluster kubeconfig save ${cluster.name}`}
            title="Copy Command"
          />

          <Action.OpenInBrowser url={`https://cloud.digitalocean.com/kubernetes/clusters/${cluster.id}`} />
        </ActionPanel>
      }
      markdown={`\
# ${cluster.name}

To configure authentication:
\`\`\`
doctl kubernetes cluster kubeconfig save ${cluster.name}
kubectl cluster-info
\`\`\`

${
  cluster.tags.length === 0
    ? ""
    : `\
### Tags
${cluster.tags.map((tag) => `\`\`\`${tag}\`\`\``).join("\n")}
`
}
`}
      metadata={
        <Detail.Metadata>
          <Detail.Metadata.Label title="Kubernetes Version" text={cluster.version} />
          <Detail.Metadata.Label title="Auto Upgrade" text={String(cluster.auto_upgrade)} />
          <Detail.Metadata.Label title="Cluster Subnet" text={cluster.cluster_subnet} />
          <Detail.Metadata.Label title="Service Subnet" text={cluster.service_subnet} />
          <Detail.Metadata.Label title="High Availability" text={String(cluster.ha)} />
          <Detail.Metadata.Label title="Region" text={cluster.region} />
          <Detail.Metadata.Label title="Registry Enabled" text={String(cluster.registry_enabled)} />
          <Detail.Metadata.Label title="Surge Upgrade" text={String(cluster.surge_upgrade)} />
        </Detail.Metadata>
      }
    />
  );
}
