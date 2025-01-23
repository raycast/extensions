import { AppsV1Api } from "@kubernetes/client-node";
import { listResources } from "./utils";

const apiVersion = "apps/v1";

export async function listDaemonSets(client: AppsV1Api, namespace: string) {
  return listResources(() => client.listNamespacedDaemonSet({ namespace }), apiVersion, "daemonsets");
}

export async function listDeployments(client: AppsV1Api, namespace: string) {
  return listResources(() => client.listNamespacedDeployment({ namespace }), apiVersion, "deployments");
}

export async function listStatefulSets(client: AppsV1Api, namespace: string) {
  return listResources(() => client.listNamespacedStatefulSet({ namespace }), apiVersion, "statefulsets");
}
