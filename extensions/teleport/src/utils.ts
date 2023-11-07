import { spawnSync } from "child_process";
import { environment } from "@raycast/api";

export function login(username: string, password: string, proxy: string, otp: string) {
  return spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/teleport-login.sh`, username, password, proxy, otp],
    getOptions()
  );
}

export function logout() {
  return spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-logout.sh`], getOptions());
}

export async function getServersList() {
  const result = spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-server-list.sh`], getOptions());

  return JSON.parse(result.stdout.toString());
}

export async function getDatabasesList() {
  const result = spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-database-list.sh`], getOptions());

  return JSON.parse(result.stdout.toString());
}

export async function getApplicationsList() {
  const result = spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-application-list.sh`], getOptions());

  return JSON.parse(result.stdout.toString());
}

export async function getKubernetesClustersList() {
  const result = spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/teleport-kubernetes-clusters-list.sh`],
    getOptions()
  );

  return JSON.parse(result.stdout.toString());
}

export async function getKubernetesClustersPodsList() {
  const result = spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/teleport-kubernetes-clusters-pods-list.sh`],
    getOptions()
  );

  return JSON.parse(result.stdout.toString()).items;
}

export function getServerCommand(server: string, username: string) {
  return `tsh ssh ${username}@${server}`;
}

export function getKubernetesPodCommand(pod: string, namespace: string) {
  return `kubectl -n ${namespace} exec -it ${pod} -- bash`;
}

export async function connectToDatabase(connection: string, username: string, protocol: string, database: string) {
  const result = spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/teleport-database-connect.sh`, connection, username, protocol, database],
    getOptions()
  );

  return result.stdout.toString();
}

export async function connectToKubernetesCluster(cluster: string) {
  const result = spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/teleport-kubernetes-cluster-connect.sh`, cluster],
    getOptions()
  );

  return result.stdout.toString();
}

export async function connectToApplication(application: string) {
  const result = spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/teleport-application-connect.sh`, application],
    getOptions()
  );

  return result.stdout.toString();
}

export function getOptions() {
  const path = "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:";
  return { env: { ...process.env, ...{ PATH: path } }, timeout: 15000 };
}
