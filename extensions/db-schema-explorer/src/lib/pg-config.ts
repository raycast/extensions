import type { ClientConfig } from "pg";

/**
 * Parse a PostgreSQL connection URL into a ClientConfig.
 * Avoids passing connectionString to pg so the library's parser (and its SSL warning) is not used.
 * SSL configuration respects the sslmode parameter from the connection string:
 * - disable: No SSL
 * - allow: Try SSL but don't require it (insecure) - Note: pg library doesn't support fallback, so this uses ssl: true
 * - prefer: Try SSL first, fallback to non-SSL - Note: pg library doesn't support fallback, so this uses ssl: true
 * - require: Require SSL but don't verify certificate (insecure)
 * - verify-ca: Require SSL and verify CA certificate
 * - verify-full: Require SSL, verify CA and hostname (most secure)
 * Default (no sslmode): No SSL for maximum compatibility (works with localhost and non-SSL servers)
 */
export function parseConnectionConfig(connectionString: string): ClientConfig {
  const url = new URL(connectionString);
  const database = url.pathname ? url.pathname.slice(1) : undefined;
  const port = url.port ? parseInt(url.port, 10) : 5432;
  const sslmode = url.searchParams.get("sslmode")?.toLowerCase();
  const sslParam = url.searchParams.get("ssl")?.toLowerCase();

  let ssl: ClientConfig["ssl"];
  switch (sslmode) {
    case "disable":
      ssl = false;
      break;
    case "allow":
    case "prefer":
      // Note: pg library doesn't support SSL fallback, so these modes use ssl: true
      // which requires SSL. If SSL fails, connection will fail.
      ssl = true;
      break;
    case "require":
      // Require SSL but don't verify certificate (insecure, but matches PostgreSQL behavior)
      ssl = { rejectUnauthorized: false };
      break;
    case "verify-ca":
    case "verify-full":
      // Require SSL with certificate verification (secure)
      ssl = { rejectUnauthorized: true };
      break;
    default:
      // Support common URLs that specify "ssl=true" instead of sslmode.
      if (sslParam === "true" || sslParam === "1" || sslParam === "yes" || sslParam === "require") {
        ssl = { rejectUnauthorized: false };
      } else if (sslParam === "false" || sslParam === "0" || sslParam === "no") {
        ssl = false;
      } else {
        // Default: no SSL for maximum compatibility.
        ssl = false;
      }
      break;
  }

  return {
    host: url.hostname,
    port: Number.isFinite(port) ? port : 5432,
    user: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    database: database || undefined,
    connectionTimeoutMillis: 10000,
    ssl,
  };
}
