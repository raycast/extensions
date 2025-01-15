import { CoreV1Api, V1Service } from "@kubernetes/client-node";
import { listServices } from "./api/coreV1";
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
          kind="Services"
          namespaced={true}
          apiClientType={CoreV1Api}
          listResources={listServices}
          matchResource={matchService}
          renderFields={renderServiceFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchService(service: V1Service, searchText: string): boolean {
  // 1. Search by name
  if (service.metadata?.name?.includes(searchText)) {
    return true;
  }

  // 2. Search by type
  if (service.spec?.type?.toLowerCase().includes(searchText)) {
    return true;
  }

  // 3. Search by cluster IP
  if (service.spec?.clusterIP?.includes(searchText)) {
    return true;
  }

  return false;
}

function renderServiceFields(service: V1Service) {
  return [
    `${service.spec?.type}`,
    `Cluster IP: ${service.spec?.clusterIP}`,
    `Ports: ${servicePort(service)}`,
    `Age: ${kubernetesObjectAge(service)}`,
  ];
}

function servicePort(service: V1Service) {
  return service.spec?.ports
    ?.map((port) => (port.protocol === "TCP" ? port.port : `${port.port}/${port.protocol}`))
    .join(", ");
}
