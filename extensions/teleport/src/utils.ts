import { spawnSync } from "child_process";
import { environment } from "@raycast/api";

export function login(username: string, password: string, proxy: string, otp: string) {
  return spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-login.sh`, username, password, proxy, otp], {
    env: getEnv(),
  });
}

export function logout() {
  return spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-logout.sh`], { env: getEnv() });
}

export async function getServersList() {
  const result = spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-server-list.sh`], { env: getEnv() });

  return JSON.parse(result.stdout.toString());
}

export async function getDatabasesList() {
  const result = spawnSync("sh", [`${environment.assetsPath}/scripts/teleport-database-list.sh`], { env: getEnv() });

  return JSON.parse(result.stdout.toString());
}

export function getServerCommand(server: string, username: string) {
  return `tsh ssh ${username}@${server}`;
}

export async function connectToDatabase(connection: string, username: string, protocol: string, database: string) {
  const result = spawnSync(
    "sh",
    [`${environment.assetsPath}/scripts/teleport-database-connect.sh`, connection, username, protocol, database],
    { env: getEnv() }
  );

  return result.stdout.toString();
}

export function getEnv() {
  const path = "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:";
  return { ...process.env, ...{ PATH: path } };
}
