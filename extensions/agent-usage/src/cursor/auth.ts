import { execFileSync } from "child_process";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { decodeJwtPayload } from "../agents/jwt";

const DEFAULT_CURSOR_STATE_DB = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "Cursor",
  "User",
  "globalStorage",
  "state.vscdb",
);

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
  now?: number;
}

function trimToNull(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function getCursorUserIdFromPayload(payload: CursorAccessTokenPayload | null): string | null {
  const subject = payload?.sub;
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

export function resolveCursorStateDbPath(env: NodeJS.ProcessEnv = process.env): string {
  return trimToNull(env.TEST_CURSOR_STATE_DB_PATH) ?? trimToNull(env.CURSOR_STATE_DB_PATH) ?? DEFAULT_CURSOR_STATE_DB;
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

export function readCursorAppAccessToken(dbPath = resolveCursorStateDbPath()): string | null {
  if (!fs.existsSync(dbPath)) {
    return null;
  }

  try {
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
  const accessToken = readCursorAppAccessToken(options.dbPath);
  if (!accessToken) {
    return null;
  }

  const session = resolveAccessToken(accessToken, options.now ?? Date.now());
  return session ? { ...session, source: "cursor-app" } : null;
}
