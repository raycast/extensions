import { allServers } from "./helpers";

export default async function tool() {
  const servers = await allServers();
  return servers.map(({ server }) => ({
    id: server.id,
    name: server.name,
    provider: server.provider,
    region: server.region,
    ipAddress: server.ip_address,
    phpVersion: server.php_version,
    databaseType: server.database_type,
    connectionStatus: server.connection_status,
    isReady: server.is_ready,
  }));
}
