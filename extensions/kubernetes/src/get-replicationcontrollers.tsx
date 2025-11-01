import { V1ReplicationController } from "@kubernetes/client-node";
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
          kind="ReplicationController"
          namespaced={true}
          matchResource={matchReplicationController}
          renderFields={renderReplicationControllerFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchReplicationController(replicationController: V1ReplicationController, searchText: string): boolean {
  if (replicationController.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderReplicationControllerFields(replicationController: V1ReplicationController) {
  return [
    `Desired: ${replicationControllerDesired(replicationController)}`,
    `Current: ${replicationControllerCurrent(replicationController)}`,
    `Ready: ${replicationControllerReady(replicationController)}`,
    `Age: ${kubernetesObjectAge(replicationController)}`,
  ];
}

function replicationControllerDesired(replicationController: V1ReplicationController) {
  return replicationController.spec?.replicas;
}

function replicationControllerCurrent(replicationController: V1ReplicationController) {
  return replicationController.status?.replicas;
}

function replicationControllerReady(replicationController: V1ReplicationController) {
  return replicationController.status?.readyReplicas;
}
