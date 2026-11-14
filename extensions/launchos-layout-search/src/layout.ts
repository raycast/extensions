import { execFile } from "node:child_process";
import { statSync } from "node:fs";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execute = promisify(execFile);
export const DEFAULT_DATABASE = join(
  homedir(),
  "Library",
  "Application Support",
  "LaunchOS",
  "LaunchOS.sqlite",
);
export const READ_QUERY = `SELECT a.Z_PK AS id,a.ZNAME AS name,a.ZALIAS AS alias,a.ZURL AS url,
  a.ZBUNDLEID AS bundleId,a.ZHIDDEN AS hidden,g.ZNAME AS groupName,
  g.ZISFOLDER AS isFolder,g.ZPAGE AS pageNumber
  FROM ZAPPENTITY a LEFT JOIN ZGROUPENTITY g ON a.ZGROUP=g.Z_PK
  ORDER BY g.ZPAGE,g.ZORDER,a.ZORDER,a.Z_PK LIMIT 5001;`;

export interface LayoutApp {
  id: string;
  name: string;
  originalName: string;
  path: string;
  bundleId: string;
  group: string;
  hidden: boolean;
}
export interface Layout {
  apps: LayoutApp[];
  skipped: number;
  truncated: boolean;
}

export function appPathFromUrl(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== "file:" || url.hostname || url.search || url.hash)
      return undefined;
    const path = fileURLToPath(url).replace(/\/$/, "");
    if (!isAbsolute(path) || !/\.app$/i.test(path) || /[\0\r\n]/.test(path))
      return undefined;
    return path;
  } catch {
    return undefined;
  }
}

export function parseLayout(
  raw: string | unknown[],
  includeHidden = false,
): Layout {
  const rows: unknown = typeof raw === "string" ? JSON.parse(raw || "[]") : raw;
  if (!Array.isArray(rows))
    throw new Error("LaunchOS returned an unrecognized layout format.");
  const apps: LayoutApp[] = [];
  const seen = new Set<string>();
  let skipped = 0;
  for (const row of rows.slice(0, 5000)) {
    if (!row || typeof row !== "object") {
      skipped++;
      continue;
    }
    const record = row as Record<string, unknown>;
    const path = appPathFromUrl(record.url);
    if (
      !path ||
      typeof record.name !== "string" ||
      !record.name.trim() ||
      record.id === undefined
    ) {
      skipped++;
      continue;
    }
    const hidden = record.hidden === 1;
    if (hidden && !includeHidden) continue;
    if (seen.has(path)) continue;
    seen.add(path);
    const alias = typeof record.alias === "string" ? record.alias.trim() : "";
    const originalName = record.name.trim();
    const folder =
      record.isFolder === 1 && typeof record.groupName === "string"
        ? record.groupName.trim()
        : "";
    const group =
      folder ||
      (Number.isInteger(record.pageNumber) && Number(record.pageNumber) >= 0
        ? `Page ${Number(record.pageNumber) + 1}`
        : "Ungrouped");
    apps.push({
      id: String(record.id),
      name: alias || originalName,
      originalName,
      path,
      bundleId: typeof record.bundleId === "string" ? record.bundleId : "",
      group,
      hidden,
    });
  }
  return { apps, skipped, truncated: rows.length > 5000 };
}

/** Returns a user-facing problem with the database path, or undefined when it can be read. */
export function databasePathProblem(databasePath: string): string | undefined {
  if (!isAbsolute(databasePath) || /[\0\r\n]/.test(databasePath))
    return "Choose an absolute local path to LaunchOS.sqlite.";
  try {
    if (statSync(databasePath).isFile()) return undefined;
  } catch {
    // Reported below.
  }
  return "LaunchOS’s layout database was not found. Open LaunchOS once, or select its database in extension preferences.";
}

export async function readLayout(
  databasePath: string,
  includeHidden = false,
): Promise<Layout> {
  if (!isAbsolute(databasePath) || /[\0\r\n]/.test(databasePath))
    throw new Error("Choose an absolute local path to LaunchOS.sqlite.");
  try {
    const info = await stat(databasePath);
    if (!info.isFile()) throw new Error("Not a file");
  } catch {
    throw new Error(
      "LaunchOS’s layout database was not found. Open LaunchOS once, or select its database in extension preferences.",
    );
  }
  let stdout: string;
  try {
    ({ stdout } = await execute(
      "/usr/bin/sqlite3",
      ["-readonly", "-json", databasePath, READ_QUERY],
      { timeout: 5000, maxBuffer: 8 * 1024 * 1024 },
    ));
  } catch {
    throw new Error(
      "Could not read this LaunchOS layout. Its database may be busy or use a newer format. Refresh after LaunchOS finishes loading.",
    );
  }
  return parseLayout(stdout, includeHidden);
}

export async function verifyAppPath(path: string): Promise<void> {
  if (!isAbsolute(path) || !/\.app$/i.test(path))
    throw new Error("This layout entry is not an app bundle.");
  try {
    const info = await stat(path);
    if (!info.isDirectory()) throw new Error("Not an app bundle");
  } catch {
    throw new Error(
      "This app is no longer installed at its saved LaunchOS location.",
    );
  }
}
