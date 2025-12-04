import { V1ResourceQuota } from "@kubernetes/client-node";
import { ResourceList } from "./components/ResourceList";
import { KubernetesContextProvider } from "./states/context";
import { KubernetesNamespaceProvider } from "./states/namespace";

export default function Command() {
  return (
    <KubernetesContextProvider>
      <KubernetesNamespaceProvider>
        <ResourceList
          apiVersion="v1"
          kind="ResourceQuota"
          namespaced={true}
          matchResource={matchResourceQuota}
          renderFields={renderResourceQuotaFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchResourceQuota(resourceQuota: V1ResourceQuota, searchText: string) {
  if (resourceQuota.metadata?.name?.includes(searchText)) {
    return true;
  }
  return false;
}

function renderResourceQuotaFields(resourceQuota: V1ResourceQuota) {
  return [
    `CPU(R): ${resourceQuotaRequestCPU(resourceQuota)}`,
    `Mem(R): ${resourceQuotaRequestMemory(resourceQuota)}`,
    `CPU(L): ${resourceQuotaLimitCPU(resourceQuota)}`,
    `Mem(L): ${resourceQuotaLimitMemory(resourceQuota)}`,
  ];
}

function resourceQuotaRequestCPU(resourceQuota: V1ResourceQuota) {
  return resourceQuotaUsage(resourceQuota, "requests.cpu");
}

function resourceQuotaRequestMemory(resourceQuota: V1ResourceQuota) {
  return resourceQuotaUsage(resourceQuota, "requests.memory");
}

function resourceQuotaLimitCPU(resourceQuota: V1ResourceQuota) {
  return resourceQuotaUsage(resourceQuota, "limits.cpu");
}

function resourceQuotaLimitMemory(resourceQuota: V1ResourceQuota) {
  return resourceQuotaUsage(resourceQuota, "limits.memory");
}

function resourceQuotaUsage(resourceQuota: V1ResourceQuota, resource: string) {
  if (!(resource in (resourceQuota.spec?.hard ?? {}))) {
    return "<unlimited>";
  }
  return `${resourceQuota.status?.used?.[resource]}/${resourceQuota.status?.hard?.[resource]}`;
}
