import { V1PersistentVolumeClaim } from "@kubernetes/client-node";
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
          kind="PersistentVolumeClaim"
          namespaced={true}
          matchResource={matchPersistentVolumeClaim}
          renderFields={renderPersistentVolumeClaimFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchPersistentVolumeClaim(persistentVolumeClaim: V1PersistentVolumeClaim, searchText: string): boolean {
  // 1. Search by name
  if (persistentVolumeClaim.metadata?.name?.includes(searchText)) {
    return true;
  }

  // 2. Search by volume name
  if (persistentVolumeClaim.spec?.volumeName?.includes(searchText)) {
    return true;
  }

  // 3. Search by status
  if (persistentVolumeClaimStatus(persistentVolumeClaim).includes(searchText)) {
    return true;
  }

  // 4. Search by storage class
  if (persistentVolumeClaim.spec?.storageClassName?.includes(searchText)) {
    return true;
  }

  return false;
}

function renderPersistentVolumeClaimFields(persistentVolumeClaim: V1PersistentVolumeClaim) {
  return [
    persistentVolumeClaim.spec?.volumeName ?? "<VolumeName>",
    persistentVolumeClaim.spec?.resources?.requests?.storage ?? "<Capacity>",
    persistentVolumeClaimStatus(persistentVolumeClaim),
    persistentVolumeClaim.spec?.storageClassName ?? "<StorageClass>",
    `Age: ${kubernetesObjectAge(persistentVolumeClaim)}`,
  ];
}

function persistentVolumeClaimStatus(persistentVolumeClaim: V1PersistentVolumeClaim) {
  return persistentVolumeClaim.status?.phase ?? "Unknown";
}
