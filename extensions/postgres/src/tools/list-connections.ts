import { getActiveConnection, listConnections } from "../lib/connections";

/**
 * Lists the saved connection profiles and marks the active one, so the model can tell the user
 * which database a query would hit. Passwords are never returned.
 */
export default async function () {
  const [connections, active] = await Promise.all([listConnections(), getActiveConnection()]);

  if (connections.length === 0 && !active) {
    return {
      connections: [],
      hint: "No PostgreSQL connection is configured yet. Add one with the Manage Connections command.",
    };
  }

  // `active` can be the preferences fallback, which is not in the saved list.
  const saved = connections.length > 0 ? connections : active ? [active] : [];
  return {
    active: active?.name,
    connections: saved.map((connection) => ({
      name: connection.name,
      host: connection.host,
      port: connection.port,
      database: connection.database,
      user: connection.user,
      ssl: connection.ssl,
      isActive: connection.id === active?.id,
    })),
  };
}
