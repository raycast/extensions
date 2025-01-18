import { AppsV1Api, V1DaemonSet } from "@kubernetes/client-node";
import { listDaemonSets } from "./api/appsV1";
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
          kind="DaemonSets"
          namespaced={true}
          apiClientType={AppsV1Api}
          listResources={listDaemonSets}
          matchResource={matchDaemonSet}
          renderFields={renderDaemonSetFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchDaemonSet(daemonSet: V1DaemonSet, searchText: string): boolean {
  if (daemonSet.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderDaemonSetFields(daemonSet: V1DaemonSet) {
  return [
    `Desired: ${daemonSet.status?.desiredNumberScheduled ?? 0}`,
    `Current: ${daemonSet.status?.currentNumberScheduled ?? 0}`,
    `Ready: ${daemonSet.status?.numberReady ?? 0}`,
    `Age: ${kubernetesObjectAge(daemonSet)}`,
  ];
}
