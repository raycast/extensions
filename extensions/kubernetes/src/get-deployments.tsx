import { AppsV1Api, V1Deployment } from "@kubernetes/client-node";
import { listDeployments } from "./api/appsV1";
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
          kind="Deployments"
          namespaced={true}
          apiClientType={AppsV1Api}
          listResources={listDeployments}
          matchResource={matchDeployment}
          renderFields={renderDeploymentFields}
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
