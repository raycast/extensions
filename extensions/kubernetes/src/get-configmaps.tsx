import { CoreV1Api, V1ConfigMap } from "@kubernetes/client-node";
import { listConfigMaps } from "./api/coreV1";
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
          kind="ConfigMaps"
          namespaced={true}
          apiClientType={CoreV1Api}
          listResources={listConfigMaps}
          matchResource={matchConfigMap}
          renderFields={renderConfigMapFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchConfigMap(configMap: V1ConfigMap, searchText: string): boolean {
  if (configMap.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderConfigMapFields(configMap: V1ConfigMap) {
  return [`Data: ${Object.keys(configMap.data ?? {}).length}`, `Age: ${kubernetesObjectAge(configMap)}`];
}
