import { CoreV1Api } from "@kubernetes/client-node";
import { listResources } from "./utils";

const apiVersion = "v1";

export async function listConfigMaps(client: CoreV1Api, namespace: string) {
  return listResources(() => client.listNamespacedConfigMap({ namespace }), apiVersion, "configmaps");
}

export async function listEndpoints(client: CoreV1Api, namespace: string) {
  return listResources(() => client.listNamespacedEndpoints({ namespace }), apiVersion, "endpoints");
}

export async function listPods(client: CoreV1Api, namespace: string) {
  return listResources(() => client.listNamespacedPod({ namespace }), apiVersion, "pods");
}

export async function listNamespaces(client: CoreV1Api) {
  return listResources(() => client.listNamespace(), apiVersion, "namespaces");
}

export async function listNodes(client: CoreV1Api) {
  return listResources(() => client.listNode(), apiVersion, "nodes");
}

export async function listPersistentVolumes(client: CoreV1Api) {
  return listResources(() => client.listPersistentVolume(), apiVersion, "persistentvolumes");
}

export async function listPersistentVolumeClaims(client: CoreV1Api, namespace: string) {
  return listResources(
    () => client.listNamespacedPersistentVolumeClaim({ namespace }),
    apiVersion,
    "persistentvolumeclaims",
  );
}

export async function listServices(client: CoreV1Api) {
  return listResources(() => client.listServiceForAllNamespaces(), apiVersion, "services");
}
