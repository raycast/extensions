import { AppsV1Api, V1StatefulSet } from "@kubernetes/client-node";
import { listStatefulSets } from "./api/appsV1";
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
          kind="StatefulSets"
          namespaced={true}
          apiClientType={AppsV1Api}
          listResources={listStatefulSets}
          matchResource={matchStatefulSet}
          renderFields={renderStatefulSetAccessories}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchStatefulSet(statefulSet: V1StatefulSet, searchText: string): boolean {
  if (statefulSet.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderStatefulSetAccessories(statefulSet: V1StatefulSet) {
  return [`Ready: ${statefulSetReadyPods(statefulSet)}`, `Age: ${kubernetesObjectAge(statefulSet)}`];
}

function statefulSetReadyPods(statefulSet: V1StatefulSet): string {
  const ready = statefulSet.status?.readyReplicas ?? 0;
  const desired = statefulSet.spec?.replicas ?? 0;
  return `${ready}/${desired}`;
}
