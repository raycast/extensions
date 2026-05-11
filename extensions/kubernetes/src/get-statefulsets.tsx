import { V1StatefulSet } from "@kubernetes/client-node";
import { ResourceList } from "./components/ResourceList";
import PodList from "./components/resources/PodList";
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
          kind="StatefulSet"
          namespaced={true}
          matchResource={matchStatefulSet}
          renderFields={renderStatefulSetAccessories}
          relatedResource={{ kind: "Pod", render: renderStatefulSetRelatedResource }}
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

function renderStatefulSetRelatedResource(statefulSet: V1StatefulSet) {
  return (
    <PodList
      namespace={statefulSet.metadata?.namespace}
      labelSelector={labelSelectorToString(statefulSet.spec?.selector)}
    />
  );
}
