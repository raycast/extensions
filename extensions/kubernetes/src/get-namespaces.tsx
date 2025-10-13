import { V1Namespace } from "@kubernetes/client-node";
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
          kind="Namespace"
          namespaced={false}
          matchResource={matchNamespace}
          renderFields={renderNamespaceFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchNamespace(namespace: V1Namespace, searchText: string): boolean {
  if (namespace.metadata?.name?.includes(searchText)) {
    return true;
  }

  return false;
}

function renderNamespaceFields(namespace: V1Namespace) {
  return [namespaceStatus(namespace), kubernetesObjectAge(namespace)];
}

function namespaceStatus(namespace: V1Namespace) {
  return namespace.status?.phase ?? "Unknown";
}
