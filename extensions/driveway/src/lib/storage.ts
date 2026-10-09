import { LocalStorage } from "@raycast/api";
import { randomUUID } from "node:crypto";
import { normalizeHost, serverIdentity, type ServerEntry } from "./share";

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

// Carries the entry it clashed with, so callers can point the user at it
// instead of just refusing the save.
export class DuplicateServerError extends Error {
  constructor(
    message: string,
    readonly existingId: string,
  ) {
    super(message);
  }
}

// `ignoreId` lets an edit keep its own identity without matching itself.
function assertNotDuplicate(servers: ServerEntry[], entry: Omit<ServerEntry, "id">, ignoreId?: string): void {
  const identity = serverIdentity(entry);
  const clash = servers.find((server) => server.id !== ignoreId && serverIdentity(server) === identity);
  if (!clash) return;

  const label = clash.alias?.trim() || [clash.host, clash.path].filter(Boolean).join("/");
  throw new DuplicateServerError(label, clash.id);
}

// A host is stored the way it is compared, so a trailing dot can't make the
// same machine look like two drives. Entries saved before this still match,
// since every comparison goes through hostKey or normalizeHost.
export async function addServer(entry: Omit<ServerEntry, "id">): Promise<void> {
  const servers = await getServers();
  const normalized = { ...entry, host: normalizeHost(entry.host) };
  assertNotDuplicate(servers, normalized);
  servers.push({ id: randomUUID(), ...normalized });
  await saveServers(servers);
}

export async function updateServer(id: string, entry: Omit<ServerEntry, "id">): Promise<void> {
  const servers = await getServers();
  const index = servers.findIndex((server) => server.id === id);
  if (index === -1) return;

  const normalized = { ...entry, host: normalizeHost(entry.host) };
  assertNotDuplicate(servers, normalized, id);
  // The form owns only its own fields. Anything else on the record, the
  // Auto-Reconnect flag in particular, has to survive an edit.
  servers[index] = { ...servers[index], ...normalized, id };
  await saveServers(servers);
}

export async function removeServer(id: string): Promise<void> {
  const servers = await getServers();
  await saveServers(servers.filter((server) => server.id !== id));
}

export async function setAutoMount(id: string, autoMount: boolean): Promise<void> {
  const servers = await getServers();
  const index = servers.findIndex((server) => server.id === id);
  if (index === -1) return;

  servers[index] = { ...servers[index], autoMount };
  await saveServers(servers);
}
