import { allLocalStorageItems, setLocalStorageItem } from "@raycast/api";
import { ISSHConnection } from "./types";

export async function getConnections(): Promise<ISSHConnection[]> {
  const { connections } = await allLocalStorageItems();
  if (!connections) return [];

  return JSON.parse(connections);
}

export async function saveConnections(connections: ISSHConnection[]) {
  await setLocalStorageItem("connections", JSON.stringify(connections));
}