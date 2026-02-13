import { execSync } from "child_process";
import { homedir } from "os";
import { join } from "path";

export const expandPath = (path: string): string => (path.startsWith("~/") ? join(homedir(), path.slice(2)) : path);

export const readSqliteValue = (
  dbPath: string,
  key: string,
  table = "ItemTable",
  keyColumn = "key",
  valueColumn = "value",
): string => {
  const escapedKey = key.replace(/'/g, "''");
  const query = `SELECT ${valueColumn} FROM ${table} WHERE ${keyColumn}='${escapedKey}'`;
  try {
    const result = execSync(`/usr/bin/sqlite3 "${dbPath}" "${query}"`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    if (!result) {
      throw new Error(`SQLite read failed or empty for key: ${key}`);
    }
    return result;
  } catch (e) {
    throw new Error(`SQLite read failed for key: ${key}: ${e instanceof Error ? e.message : String(e)}`);
  }
};

export const readKeychainPassword = (service: string): string | null => {
  try {
    const result = execSync(`/usr/bin/security find-generic-password -s "${service}" -w 2>/dev/null`, {
      encoding: "utf-8",
      timeout: 5000,
    }).trim();
    return result || null;
  } catch {
    return null;
  }
};

export const isJwtExpired = (jwt: string, bufferSeconds = 300): boolean => {
  const parts = jwt.split(".");
  if (parts.length < 2) return true;

  let payload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
  while (payload.length % 4 !== 0) payload += "=";

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    if (typeof decoded.exp !== "number") return true;
    return Date.now() / 1000 > decoded.exp - bufferSeconds;
  } catch {
    return true;
  }
};
