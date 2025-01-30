import { V1ReplicaSet } from "@kubernetes/client-node";
import { ResourceList } from "./components/resource-list";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";
import { kubernetesObjectAge } from "./utils/duration";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="apps/v1"
          kind="ReplicaSet"
          namespaced={true}
          matchResource={matchReplicaSet}
          renderFields={renderReplicaSetFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchReplicaSet(replicaSet: V1ReplicaSet, searchText: string): boolean {
  if (replicaSet.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderReplicaSetFields(replicaSet: V1ReplicaSet) {
  return [
    `Desired: ${replicaSetDesired(replicaSet)}`,
    `Current: ${replicaSetCurrent(replicaSet)}`,
    `Ready: ${replicaSetReady(replicaSet)}`,
    `Age: ${kubernetesObjectAge(replicaSet)}`,
  ];
}

function replicaSetDesired(replicaSet: V1ReplicaSet): string {
  const desired = replicaSet.spec?.replicas ?? 0;
  return `${desired}`;
}

function replicaSetCurrent(replicaSet: V1ReplicaSet): string {
  const current = replicaSet.status?.replicas ?? 0;
  return `${current}`;
}

function replicaSetReady(replicaSet: V1ReplicaSet): string {
  const ready = replicaSet.status?.readyReplicas ?? 0;
  return `${ready}`;
}
