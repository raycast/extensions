import { V1Deployment } from "@kubernetes/client-node";
import { ResourceList } from "./components/ResourceList";
import ReplicaSetList from "./components/resources/ReplicaSetList";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";
import { kubernetesObjectAge } from "./utils/duration";
import { labelSelectorToString } from "./utils/selector";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="apps/v1"
          kind="Deployment"
          namespaced={true}
          matchResource={matchDeployment}
          renderFields={renderDeploymentFields}
          relatedResource={{ kind: "ReplicaSet", render: renderDeploymentRelatedResource }}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchDeployment(deployment: V1Deployment, searchText: string): boolean {
  if (deployment.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderDeploymentFields(deployment: V1Deployment) {
  return [
    `Ready: ${deploymentReadyPods(deployment)}`,
    `Up-To-Date: ${deploymentUpToDatePods(deployment)}`,
    `Available: ${deploymentAvailablePods(deployment)}`,
    `Age: ${kubernetesObjectAge(deployment)}`,
  ];
}

function deploymentReadyPods(deployment: V1Deployment): string {
  const ready = deployment.status?.readyReplicas ?? 0;
  const total = deployment.status?.replicas ?? 0;
  return `${ready}/${total}`;
}

function deploymentUpToDatePods(deployment: V1Deployment): string {
  const upToDate = deployment.status?.updatedReplicas ?? 0;
  const total = deployment.status?.replicas ?? 0;
  return `${upToDate}/${total}`;
}

function deploymentAvailablePods(deployment: V1Deployment): string {
  const available = deployment.status?.availableReplicas ?? 0;
  const total = deployment.status?.replicas ?? 0;
  return `${available}/${total}`;
}

function renderDeploymentRelatedResource(deployment: V1Deployment) {
  return (
    <ReplicaSetList
      namespace={deployment.metadata?.namespace}
      labelSelector={labelSelectorToString(deployment.spec?.selector)}
    />
  );
}
