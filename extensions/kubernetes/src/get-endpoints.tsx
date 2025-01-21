import { CoreV1Api, V1Endpoints } from "@kubernetes/client-node";
import { listEndpoints } from "./api/coreV1";
import { ResourceList } from "./components/resource-list";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="Endpoints"
          namespaced={true}
          apiClientType={CoreV1Api}
          listResources={listEndpoints}
          matchResource={matchEndpoint}
          renderFields={renderEndpointFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchEndpoint(endpoint: V1Endpoints, searchText: string): boolean {
  // 1. Search by name
  if (endpoint.metadata?.name?.includes(searchText)) {
    return true;
  }

  // 2. Search by endpoints
  if (endpoint.subsets?.some((subset) => subset.addresses?.some((address) => address.ip?.includes(searchText)))) {
    return true;
  }

  return false;
}

function renderEndpointFields(endpoint: V1Endpoints) {
  return [endpointEndpoints(endpoint)];
}

function endpointEndpoints(endpoint: V1Endpoints) {
  if (!endpoint.subsets) {
    return "<none>";
  }

  const formattedEndpoints = [];
  for (const subset of endpoint.subsets) {
    if (!subset.addresses) {
      continue;
    }

    for (const address of subset.addresses) {
      if (!address.ip) {
        continue;
      }

      const ports = subset.ports
        ?.map((port) => (port.protocol === "TCP" ? port.port : `${port.port}/${port.protocol}`))
        .join(", ");
      if (formattedEndpoints.length >= 5) {
        return `${formattedEndpoints.join(", ")}, ...`;
      }
      formattedEndpoints.push(`${address.ip}:${ports}`);
    }
  }

  return formattedEndpoints.join(", ");
}
