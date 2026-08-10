import { V1PersistentVolume } from "@kubernetes/client-node";
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
          kind="PersistentVolume"
          namespaced={false}
          matchResource={matchPersistentVolume}
          renderFields={renderPersistentVolumeFields}
        />
      </KubernetesNamespaceProvider>
    </KubernetesContextProvider>
  );
}

function matchPersistentVolume(persistentVolume: V1PersistentVolume, searchText: string): boolean {
  // 1. Search by name
  if (persistentVolume.metadata?.name?.includes(searchText)) {
    return true;
  }

  // 2. Search by storage class
  if (persistentVolume.spec?.storageClassName?.includes(searchText)) {
    return true;
  }

  // 3. Search by status
  if (persistentVolume.status?.phase?.toLowerCase().includes(searchText)) {
    return true;
  }

  // 4. Search by claim
  if (persistentVolume.spec?.claimRef?.name?.includes(searchText)) {
    return true;
  }

  return false;
}

function renderPersistentVolumeFields(persistentVolume: V1PersistentVolume) {
  return [
    persistentVolumeClaim(persistentVolume),
    persistentVolume.spec?.capacity?.storage ?? "<Capacity>",
    persistentVolumeStatus(persistentVolume),
    persistentVolume.spec?.storageClassName ?? "<StorageClass>",
    `Age: ${kubernetesObjectAge(persistentVolume)}`,
  ];
}

function persistentVolumeStatus(persistentVolume: V1PersistentVolume) {
  return persistentVolume.status?.phase ?? "Unknown";
}

function persistentVolumeClaim(persistentVolume: V1PersistentVolume) {
  return persistentVolume.spec?.claimRef?.name ?? "<none>";
}
