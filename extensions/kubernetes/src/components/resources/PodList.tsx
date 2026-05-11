import { V1Pod } from "@kubernetes/client-node";
import { FunctionComponent } from "react";
import { KubernetesContextProvider } from "../../states/context";
import { KubernetesNamespaceProvider } from "../../states/namespace";
import { kubernetesObjectAge } from "../../utils/duration";
import { ResourceList } from "../ResourceList";

const PodList: FunctionComponent<{ namespace?: string; labelSelector?: string }> = ({ namespace, labelSelector }) => {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="Pod"
          namespaced={true}
          matchResource={matchPod}
          renderFields={renderPodFields}
          namespace={namespace}
          labelSelector={labelSelector}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
};

export default PodList;

function matchPod(pod: V1Pod, searchText: string) {
  // 1. Search by name
  if (pod.metadata?.name?.includes(searchText)) {
    return true;
  }

  // 2. Search by IP
  if (pod.status?.podIP?.includes(searchText)) {
    return true;
  }

  // 3. Search by node name
  if (pod.spec?.nodeName?.includes(searchText)) {
    return true;
  }

  // 4. Search by status
  if (pod.status?.phase?.toLowerCase().includes(searchText)) {
    return true;
  }

  return false;
}

function renderPodFields(pod: V1Pod) {
  return [
    podStatus(pod),
    `Ready: ${podReadyContainers(pod)}`,
    `IP: ${pod.status?.podIP ?? "<unknown>"}`,
    `Age: ${kubernetesObjectAge(pod)}`,
  ];
}

function podStatus(pod: V1Pod) {
  return pod.status?.phase ?? "Unknown";
}

function podReadyContainers(pod: V1Pod) {
  const ready = pod.status?.containerStatuses?.filter((status) => status.ready).length ?? 0;
  const total = pod.status?.containerStatuses?.length ?? 0;
  return `${ready}/${total}`;
}
