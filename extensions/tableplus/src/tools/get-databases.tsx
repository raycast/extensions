import { fetchDatabases } from "../utils";

export default async function getDatabases() {
  const { connections } = await fetchDatabases();
  return connections?.flatMap((group) =>
    group.connections.map((connection) => ({
      id: connection.id,
      name: connection.name,
      groupName: group.name || undefined,
      environment: connection.Environment || undefined,
      driver: connection.Driver || undefined,
    })),
  );
}
