import { CoreV1Api } from "@kubernetes/client-node";
import { listResources } from "./utils";

const apiVersion = "v1";

export async function listPods(client: CoreV1Api, namespace: string) {
  return listResources(() => client.listNamespacedPod({ namespace }), apiVersion, "pods");
}

export async function listNamespaces(client: CoreV1Api) {
  return listResources(() => client.listNamespace(), apiVersion, "namespaces");
}

export async function listNodes(client: CoreV1Api) {
  return listResources(() => client.listNode(), apiVersion, "nodes");
}

export async function listServices(client: CoreV1Api) {
  return listResources(() => client.listServiceForAllNamespaces(), apiVersion, "services");
}
