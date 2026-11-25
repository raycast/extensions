import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { nanoid } from "nanoid";
import { resolve } from "node:path";
import {
  changeConfigConnection,
  defaultConfigFile,
  readConfigConnections,
  setConfigConnectionIcon,
} from "./ssh-config";
import { ISSHConnection } from "./types";

const preferences = getPreferenceValues<Preferences>();
const configFile =
  preferences.sshConfig === "localStorage"
    ? undefined
    : preferences.sshConfigFile === "~/.ssh/config" || !preferences.sshConfigFile
      ? defaultConfigFile
      : resolve(preferences.sshConfigFile);

export async function getConnections(): Promise<ISSHConnection[]> {
  if (configFile) return readConfigConnections(configFile);
  const connections = await LocalStorage.getItem<string>("connections");
  return connections ? JSON.parse(connections) : [];
}

export async function upsertConnection(connection: ISSHConnection, original?: ISSHConnection) {
  if (configFile) {
    changeConfigConnection(configFile, original, connection);
    return;
  }

  const connections = await getConnections();
  if (connections.some((entry) => entry.name === connection.name && entry.id !== original?.id)) {
    throw new Error("Choose a unique connection name.");
  }
  const current = connections.filter((entry) => entry.id !== original?.id);
  current.push({ ...connection, id: original?.id ?? nanoid() });
  await LocalStorage.setItem("connections", JSON.stringify(current));
}

export async function removeConnection(connection: ISSHConnection) {
  if (configFile) {
    changeConfigConnection(configFile, connection, undefined);
    return;
  }
  const connections = await getConnections();
  await LocalStorage.setItem("connections", JSON.stringify(connections.filter((entry) => entry.id !== connection.id)));
}

export function setConnectionIcon(connection: ISSHConnection, value: string) {
  if (configFile) setConfigConnectionIcon(configFile, connection, value);
}
