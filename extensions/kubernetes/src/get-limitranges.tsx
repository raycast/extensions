import { V1LimitRange } from "@kubernetes/client-node";
import { ResourceList } from "./components/ResourceList";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="LimitRange"
          namespaced={true}
          matchResource={matchLimitRange}
          renderFields={renderLimitRangeFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchLimitRange(limitRange: V1LimitRange, searchText: string) {
  if (limitRange.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderLimitRangeFields(limitRange: V1LimitRange) {
  return [`Created At: ${limitRange.metadata?.creationTimestamp?.toLocaleString()}`];
}
