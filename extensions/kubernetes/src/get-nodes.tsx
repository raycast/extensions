import { V1Node } from "@kubernetes/client-node";
import { ResourceList } from "./components/ResourceList";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";
import { kubernetesObjectAge } from "./utils/duration";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="Node"
          namespaced={false}
          matchResource={matchNode}
          renderFields={renderNodeFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchNode(node: V1Node, searchText: string): boolean {
  if (node.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderNodeFields(node: V1Node) {
  return [`Status: ${nodeStatus(node)}`, `Roles: ${nodeRole(node)}`, `Age: ${kubernetesObjectAge(node)}`];
}

function nodeStatus(node: V1Node): string {
  return (
    node.status?.conditions
      ?.filter((c) => c.status === "True")
      .map((c) => c.type)
      .join(", ") ?? "<unknown>"
  );
}

function nodeRole(node: V1Node): string {
  const labels = node.metadata?.labels ?? {};
  if ("node-role.kubernetes.io/control-plane" in labels) {
    return "Control Plane";
  }
  return "Worker";
}
