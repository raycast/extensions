import type { ClientConfig } from "pg";

/**
 * Parse a PostgreSQL connection URL into a ClientConfig.
 * Avoids passing connectionString to pg so the library's parser (and its SSL warning) is not used.
 */
export function parseConnectionConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  const database = url.pathname ? url.pathname.slice(1) : undefined;
  const port = url.port ? parseInt(url.port, 10) : 5432;
  return {
    host: url.hostname,
    port: Number.isFinite(port) ? port : 5432,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: database || undefined,
    connectionTimeoutMillis: 10000,
    ssl: { rejectUnauthorized: false },
  };
}
