import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import type { ServerEntry } from "./share";

const STORAGE_KEY = "smb-servers";

export async function getServers(): Promise<ServerEntry[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function saveServers(servers: ServerEntry[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(servers));
}

export async function addServer(entry: Omit<ServerEntry, "id">): Promise<void> {
  const servers = await getServers();
  servers.push({ id: randomUUID(), ...entry });
  await saveServers(servers);
}

export async function updateServer(
  id: string,
  entry: Omit<ServerEntry, "id">,
): Promise<void> {
  const servers = await getServers();
  const index = servers.findIndex((server) => server.id === id);
  if (index === -1) return;

  servers[index] = { id, ...entry };
  await saveServers(servers);
}

export async function removeServer(id: string): Promise<void> {
  const servers = await getServers();
  await saveServers(servers.filter((server) => server.id !== id));
}
