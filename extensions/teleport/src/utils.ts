import { exec } from "child_process";
import { environment } from "@raycast/api";
import { promisify } from "util";

export async function getServersList() {
  const execp = promisify(exec);
  const output = await execp(`sh ${environment.assetsPath}/scripts/teleport-server-list.sh`, { env: getEnv() });
  return JSON.parse(output.stdout);
}

export async function getDatabasesList() {
  const execp = promisify(exec);
  const output = await execp(`sh ${environment.assetsPath}/scripts/teleport-database-list.sh`, { env: getEnv() });
  return JSON.parse(output.stdout);
}

export async function getServerCommand(server: string, username: string) {
  return `tsh ssh ${username}@${server}`;
}

export async function connectToDatabase(connection: string, username: string, protocol: string, database: string) {
  const execp = promisify(exec);
  const output = await execp(
    `sh ${environment.assetsPath}/scripts/teleport-database-connect.sh ${connection} ${username} ${protocol} ${database}`,
    { env: getEnv() }
  );
  return output.stdout;
}

export function getEnv() {
  const path = "/usr/local/bin:/usr/bin:/bin:/opt/homebrew/bin:";
  return { ...process.env, ...{ PATH: path } };
}
