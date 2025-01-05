import { CoreV1Api, V1Pod } from "@kubernetes/client-node";
import { listPods } from "./api/coreV1";
import { ResourceList } from "./components/resource-list";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";
import { kubernetesObjectAge } from "./utils/duration";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="Pods"
          namespaced={true}
          apiClientType={CoreV1Api}
          listResources={listPods}
          matchResource={matchPod}
          renderFields={renderPodFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

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
