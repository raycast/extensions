import { findServer, sitesOnServer } from "./helpers";

type Input = {
  /**
   * The server's id as a string, for example "678350", or its exact name.
   */
  server: string;
};

export default async function tool({ server }: Input) {
  const { server: found } = await findServer(server);
  const sites = await sitesOnServer(found);
  return {
    id: found.id,
    name: found.name,
    slug: found.slug,
    type: found.type,
    provider: found.provider,
    providerId: found.identifier,
    region: found.region,
    size: found.size,
    ipAddress: found.ip_address,
    privateIpAddress: found.private_ip_address,
    sshPort: found.ssh_port,
    timezone: found.timezone,
    ubuntuVersion: found.ubuntu_version,
    phpVersion: found.php_version,
    phpCliVersion: found.php_cli_version,
    databaseType: found.database_type,
    dbStatus: found.db_status,
    redisStatus: found.redis_status,
    opcacheStatus: found.opcache_status,
    connectionStatus: found.connection_status,
    isReady: found.is_ready,
    revoked: found.revoked,
    createdAt: found.created_at,
    updatedAt: found.updated_at,
    sites,
  };
}
