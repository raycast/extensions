import { showHUD, getPreferenceValues, Application } from "@raycast/api";
import { exec } from "child_process";
import { promisify } from "util";
import { Connection } from "./types/connection";

export interface ExecResult {
  stdout: string;
  stderr: string;
}

export const preferences: {
  connectionId: string;
  connectionPin: string;
  pritunlApp: Application;
} = getPreferenceValues();

const execp = promisify(exec);

const pritunlWithPath = `${preferences.pritunlApp.path}/Contents/Resources/pritunl-client`;

async function listConnections(): Promise<Connection[]> {
  const result = await execp(`${pritunlWithPath} list -j`);
  return JSON.parse(result.stdout);
}

async function isConnected(id: string): Promise<boolean> {
  const output = await listConnections();

  const connections = output
    .map((connection) => ({ id: connection["id"], state: connection["status"] != "Disconnected" }))
    .filter((connection) => connection.id == id);
  return connections[0].state;
}

export default async function main() {
  const connected = await isConnected(preferences.connectionId);

  if (connected) {
    execp(`${pritunlWithPath} stop ${preferences.connectionId}`);
    await showHUD(`Pritunl is disconnecting`);
  } else {
    execp(`${pritunlWithPath} start ${preferences.connectionId} -p ${preferences.connectionPin}`);
    await showHUD(`Pritunl is connecting`);
  }
}
