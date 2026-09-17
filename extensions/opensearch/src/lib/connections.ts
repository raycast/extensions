import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";

export type AuthType = "basic" | "sigv4";
export type AwsService = "es" | "aoss";

export interface Connection {
  id: string;
  name: string;
  url: string;
  ignoreCerts: boolean;
  isDefault?: boolean;
  auth: AuthType;
  // Basic auth
  username?: string;
  password?: string;
  // AWS SigV4
  awsRegion?: string;
  awsService?: AwsService;
  awsAccessKeyId?: string;
  awsSecretAccessKey?: string;
  awsSessionToken?: string;
}

const STORAGE_KEY = "opensearch.connections";

export async function listConnections(): Promise<Connection[]> {
  const raw = await LocalStorage.getItem<string>(STORAGE_KEY);
  return raw ? (JSON.parse(raw) as Connection[]) : [];
}

async function saveConnections(connections: Connection[]): Promise<void> {
  await LocalStorage.setItem(STORAGE_KEY, JSON.stringify(connections));
}

export function newConnection(input: Omit<Connection, "id">): Connection {
  return { ...input, id: randomUUID() };
}

export async function upsertConnection(connection: Connection): Promise<void> {
  const connections = await listConnections();
  if (connection.isDefault) {
    connections.forEach((c) => (c.isDefault = false));
  }
  const index = connections.findIndex((c) => c.id === connection.id);
  if (index >= 0) {
    connections[index] = connection;
  } else {
    connections.push(connection);
  }
  // Always keep exactly one default.
  if (!connections.some((c) => c.isDefault)) {
    connections[0].isDefault = true;
  }
  await saveConnections(connections);
}

export async function removeConnection(id: string): Promise<void> {
  const connections = (await listConnections()).filter((c) => c.id !== id);
  if (connections.length > 0 && !connections.some((c) => c.isDefault)) {
    connections[0].isDefault = true;
  }
  await saveConnections(connections);
}

export async function setDefaultConnection(id: string): Promise<void> {
  const connections = await listConnections();
  connections.forEach((c) => (c.isDefault = c.id === id));
  await saveConnections(connections);
}

/**
 * The connection used by commands that don't ask the user to pick one.
 * Falls back to the extension preferences when no connection has been saved.
 */
export async function getActiveConnection(): Promise<Connection | undefined> {
  const connections = await listConnections();
  const active = connections.find((c) => c.isDefault) ?? connections[0];
  return active ?? connectionFromPreferences();
}

export function connectionFromPreferences(): Connection | undefined {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.defaultUrl) return undefined;
  return {
    id: "preferences",
    name: "Preferences",
    url: prefs.defaultUrl,
    ignoreCerts: prefs.ignoreCerts ?? false,
    isDefault: true,
    auth: "basic",
    username: prefs.username || undefined,
    password: prefs.password || undefined,
  };
}
