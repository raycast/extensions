import { LocalStorage } from "@raycast/api";
import { ISSHConnection } from "./types";

export async function getConnections(): Promise<ISSHConnection[]> {
  const { connections } = await LocalStorage.allItems();
  if (!connections) return [];

  return JSON.parse(connections);
}

export async function saveConnections(connections: ISSHConnection[]) {
  await LocalStorage.setItem("connections", JSON.stringify(connections));
}
