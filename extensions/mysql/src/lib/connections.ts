import { LocalStorage, getPreferenceValues } from "@raycast/api";
import { randomUUID } from "node:crypto";

export type SslMode = "off" | "require" | "insecure";

export interface Connection {
  id: string;
  name: string;
  isDefault?: boolean;
  host: string;
  port: number;
  user: string;
  password?: string;
  database?: string;
  ssl: SslMode;
}

const STORAGE_KEY = "mysql.connections";

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
  if (connection.isDefault) connections.forEach((c) => (c.isDefault = false));
  const index = connections.findIndex((c) => c.id === connection.id);
  if (index >= 0) connections[index] = connection;
  else connections.push(connection);
  if (!connections.some((c) => c.isDefault)) connections[0].isDefault = true;
  await saveConnections(connections);
}

export async function removeConnection(id: string): Promise<void> {
  const connections = (await listConnections()).filter((c) => c.id !== id);
  if (connections.length > 0 && !connections.some((c) => c.isDefault)) connections[0].isDefault = true;
  await saveConnections(connections);
}

export async function setDefaultConnection(id: string): Promise<void> {
  const connections = await listConnections();
  connections.forEach((c) => (c.isDefault = c.id === id));
  await saveConnections(connections);
}

export async function getActiveConnection(): Promise<Connection | undefined> {
  const connections = await listConnections();
  const active = connections.find((c) => c.isDefault) ?? connections[0];
  return active ?? connectionFromPreferences();
}

const SSL_MODES: SslMode[] = ["off", "require", "insecure"];

export function connectionFromPreferences(): Connection | undefined {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.defaultHost) return undefined;
  const port = Number.parseInt(prefs.defaultPort ?? "", 10);
  const ssl = SSL_MODES.includes(prefs.defaultSsl as SslMode) ? (prefs.defaultSsl as SslMode) : "off";
  return {
    id: "preferences",
    name: "Preferences",
    isDefault: true,
    host: prefs.defaultHost,
    port: Number.isFinite(port) && port > 0 ? port : 3306,
    user: prefs.defaultUser || "root",
    password: prefs.defaultPassword || undefined,
    ssl,
  };
}
