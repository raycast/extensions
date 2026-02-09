/**
 * Parse a MySQL connection URL into config for mysql2.
 * Supports mysql:// and mysql2:// schemes.
 */
export type MysqlConnectionConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectTimeout?: number;
};

export function parseMysqlConnectionConfig(connectionString: string): MysqlConnectionConfig {
  let urlString = connectionString.trim();
  if (!urlString.includes("://")) {
    urlString = `mysql://${urlString}`;
  }
  const url = new URL(urlString);
  const port = url.port ? parseInt(url.port, 10) : 3306;
  const database = url.pathname ? url.pathname.slice(1).replace(/\/$/, "") : "";
  return {
    host: url.hostname || "localhost",
    port: Number.isFinite(port) ? port : 3306,
    user: url.username ? decodeURIComponent(url.username) : "",
    password: url.password ? decodeURIComponent(url.password) : "",
    database: database || "",
    connectTimeout: 10000,
  };
}
