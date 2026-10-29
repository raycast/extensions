import { execFileSync } from "child_process";
import * as fs from "fs";
import { createRequire } from "node:module";
import * as os from "os";
import * as path from "path";

import { decodeJwtPayload } from "../agents/jwt.ts";

interface CursorAccessTokenPayload {
  sub?: string;
  exp?: number;
}

export interface CursorAppAuthSession {
  cookieHeader: string;
  userId: string;
  source: "cursor-app";
}

interface ResolveCursorAppAuthOptions {
  dbPath?: string;
  authFilePath?: string;
  platform?: NodeJS.Platform;
  now?: number;
}

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getCursorUserIdFromPayload(payload: CursorAccessTokenPayload | null): string | null {
  const subject = payload?.sub;
  if (typeof subject !== "string") {
    return null;
  }
  const userId = subject?.split("|").filter(Boolean).at(-1)?.trim();
  if (!userId) {
    return null;
  }

  return /^[A-Za-z0-9._-]+$/.test(userId) ? userId : null;
}

function resolveAccessToken(accessToken: string, now: number): { userId: string; cookieHeader: string } | null {
  const payload = decodeJwtPayload<CursorAccessTokenPayload>(accessToken);
  if (!payload || typeof payload.exp !== "number" || payload.exp * 1000 - now <= 60_000) {
    return null;
  }

  const userId = getCursorUserIdFromPayload(payload);
  return userId ? { userId, cookieHeader: `WorkosCursorSessionToken=${userId}%3A%3A${accessToken}` } : null;
}

export function resolveCursorStateDbPath(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  homeDir = os.homedir(),
): string {
  const override = trimToNull(env.TEST_CURSOR_STATE_DB_PATH) ?? trimToNull(env.CURSOR_STATE_DB_PATH);
  if (override) return override;
  if (platform === "win32") {
    return path.win32.join(
      path.win32.dirname(resolveCursorAuthFilePath(env, platform, homeDir)),
      "User",
      "globalStorage",
      "state.vscdb",
    );
  }
  return path.join(homeDir, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
}

export function resolveCursorAuthFilePath(
  env: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform,
  homeDir = os.homedir(),
): string {
  if (platform === "win32") {
    const appData = trimToNull(env.APPDATA) ?? path.win32.join(homeDir, "AppData", "Roaming");
    return path.win32.join(appData, "Cursor", "auth.json");
  }
  return path.join(homeDir, "Library", "Application Support", "Cursor", "auth.json");
}

export function getCursorUserIdFromAccessToken(accessToken: string): string | null {
  return getCursorUserIdFromPayload(decodeJwtPayload<CursorAccessTokenPayload>(accessToken));
}

export function isCursorAccessTokenUsable(accessToken: string, now = Date.now()): boolean {
  return resolveAccessToken(accessToken, now) !== null;
}

export function buildCursorCookieHeader(accessToken: string): string | null {
  const userId = getCursorUserIdFromAccessToken(accessToken);
  return userId ? `WorkosCursorSessionToken=${userId}%3A%3A${accessToken}` : null;
}

export function readCursorAppAccessToken(
  dbPath = resolveCursorStateDbPath(),
  authFilePath = resolveCursorAuthFilePath(),
  platform: NodeJS.Platform = process.platform,
  now = Date.now(),
): string | null {
  if (platform === "win32") {
    const databaseToken = readCursorStateDbAccessToken(dbPath, platform);
    if (databaseToken && isCursorAccessTokenUsable(databaseToken, now)) return databaseToken;
    try {
      const auth: unknown = JSON.parse(fs.readFileSync(authFilePath, "utf-8"));
      if (!auth || typeof auth !== "object" || !("accessToken" in auth) || typeof auth.accessToken !== "string") {
        return null;
      }
      return trimToNull(auth.accessToken);
    } catch {
      return null;
    }
  }

  return readCursorStateDbAccessToken(dbPath, platform);
}

function readCursorStateDbAccessToken(dbPath: string, platform: NodeJS.Platform): string | null {
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  try {
    if (platform === "win32") {
      const { DatabaseSync } = createRequire(process.execPath)("node:sqlite") as typeof import("node:sqlite");
      const database = new DatabaseSync(dbPath, { readOnly: true });
      try {
        const row = database.prepare("SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken' LIMIT 1;").get();
        return typeof row?.value === "string" ? trimToNull(row.value) : null;
      } finally {
        database.close();
      }
    }
    const output = execFileSync(
      "/usr/bin/sqlite3",
      ["-readonly", dbPath, "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken' LIMIT 1;"],
      { encoding: "utf-8", timeout: 1000, stdio: ["ignore", "pipe", "ignore"] },
    );
    return trimToNull(output);
  } catch {
    return null;
  }
}

export function resolveCursorAppAuthSession(options: ResolveCursorAppAuthOptions = {}): CursorAppAuthSession | null {
  const accessToken = readCursorAppAccessToken(options.dbPath, options.authFilePath, options.platform, options.now);
  if (!accessToken) {
    return null;
  }

  const session = resolveAccessToken(accessToken, options.now ?? Date.now());
  return session ? { ...session, source: "cursor-app" } : null;
}
