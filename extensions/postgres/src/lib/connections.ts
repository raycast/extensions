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
  database: string;
  ssl: SslMode;
}

const STORAGE_KEY = "postgres.connections";

export const DEFAULT_PORT = 5432;
export const DEFAULT_STATEMENT_TIMEOUT_MS = 15_000;
export const DEFAULT_MAX_ROWS = 500;

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

/** The connection AI tools and commands run against: the default profile, else the preferences fallback. */
export async function getActiveConnection(): Promise<Connection | undefined> {
  const connections = await listConnections();
  const active = connections.find((c) => c.isDefault) ?? connections[0];
  return active ?? connectionFromPreferences();
}

const NO_CONNECTION = "No PostgreSQL connection configured. Add one with the Manage Connections command.";

/**
 * A warning to carry back with a result that came from the active connection by default.
 *
 * Returning `connection: "local"` in the payload turned out not to be enough: asked about staging,
 * a model queried the active connection, ignored that field, and presented the rows as staging's.
 * Naming the alternatives at the point of use makes the substitution harder to perform silently.
 * Only produced when the caller passed no connection and there is in fact something else to hit.
 */
export async function defaultConnectionWarning(used: Connection, explicit: boolean): Promise<string | undefined> {
  if (explicit) return undefined;
  const others = (await listConnections()).filter((c) => c.id !== used.id);
  if (others.length === 0) return undefined;
  return (
    `These rows come from the active connection "${used.name}" (database ${used.database}), because no connection ` +
    `argument was given. Also configured: ${others.map((c) => `${c.name} (${c.database})`).join(", ")}. ` +
    `If the user asked about one of those, call the tool again with the connection argument. ` +
    `Never present this result as coming from a database other than ${used.database}.`
  );
}

/**
 * Picks the connection a tool call runs against.
 *
 * Without a name this is the active connection, which keeps the common case anchored to what the
 * user chose in the UI. With one, the profile name is matched first and the database name second,
 * so "staging" finds both a profile called `staging` and one pointing at `raycast_staging`. An
 * unknown name fails loudly and lists what exists — a wrong guess must not silently fall back to
 * the active connection, which could be a different database than the user meant.
 */
export async function resolveConnection(name?: string): Promise<Connection> {
  const active = await getActiveConnection();
  if (!name?.trim()) {
    if (!active) throw new Error(NO_CONNECTION);
    return active;
  }

  const saved = await listConnections();
  const pool = saved.length > 0 ? saved : active ? [active] : [];
  if (pool.length === 0) throw new Error(NO_CONNECTION);

  const wanted = name.trim().toLowerCase();
  const match =
    pool.find((c) => c.name.toLowerCase() === wanted) ?? pool.find((c) => c.database.toLowerCase() === wanted);
  if (match) return match;

  // Deliberately does NOT suggest retrying without the argument. An earlier version ended with
  // "leave the connection argument out to use the active one", and a model took that as permission
  // to answer a question about one database with numbers from another. Naming what exists is
  // enough for a genuine near-miss; anything else has to go back to the user.
  throw new Error(
    `No connection named "${name}". Configured connections: ${pool.map((c) => c.name).join(", ")}. ` +
      `Do not answer the question from a different connection — tell the user that "${name}" is not set up, ` +
      `and that they can add it with the Manage Connections command.`,
  );
}

/**
 * Builds the fallback connection from the `postgresql://…` URL in preferences.
 *
 * A malformed URL yields `undefined` rather than throwing, so a typo in preferences surfaces as
 * "no connection configured" instead of crashing every command.
 */
export function connectionFromPreferences(): Connection | undefined {
  const prefs = getPreferenceValues<Preferences>();
  if (!prefs.defaultConnectionString) return undefined;
  try {
    const url = new URL(prefs.defaultConnectionString);
    const port = Number.parseInt(url.port, 10);
    // `sslmode=` in the query string mirrors libpq, which is what users paste in from elsewhere.
    const sslmode = url.searchParams.get("sslmode") ?? "";
    return {
      id: "preferences",
      name: "Preferences",
      isDefault: true,
      host: decodeURIComponent(url.hostname) || "localhost",
      port: Number.isFinite(port) && port > 0 ? port : DEFAULT_PORT,
      user: decodeURIComponent(url.username) || "postgres",
      password: url.password ? decodeURIComponent(url.password) : undefined,
      database: decodeURIComponent(url.pathname.replace(/^\//, "")) || "postgres",
      ssl: sslModeFromLibpq(sslmode),
    };
  } catch {
    return undefined;
  }
}

function sslModeFromLibpq(sslmode: string): SslMode {
  if (sslmode === "disable" || sslmode === "") return "off";
  if (sslmode === "verify-ca" || sslmode === "verify-full") return "require";
  return "insecure"; // allow / prefer / require: encrypted, but libpq does not verify the certificate
}

export function statementTimeoutMs(): number {
  const raw = Number.parseInt(getPreferenceValues<Preferences>().statementTimeout ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_STATEMENT_TIMEOUT_MS;
}

export function maxRows(): number {
  const raw = Number.parseInt(getPreferenceValues<Preferences>().maxRows ?? "", 10);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_MAX_ROWS;
}
