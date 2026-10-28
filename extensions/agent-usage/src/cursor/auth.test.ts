import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

function makeJwt(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

test("buildCursorCookieHeader derives the WorkOS cookie from Cursor app access token", async () => {
  const { buildCursorCookieHeader } = await import("./auth.ts");
  const token = makeJwt({ sub: "auth0|user_123", exp: Math.floor(Date.now() / 1000) + 3600 });

  assert.equal(buildCursorCookieHeader(token), `WorkosCursorSessionToken=user_123%3A%3A${token}`);
});

test("isCursorAccessTokenUsable rejects expired or malformed Cursor app tokens", async () => {
  const { isCursorAccessTokenUsable } = await import("./auth.ts");
  const now = Date.UTC(2026, 0, 1);

  assert.equal(isCursorAccessTokenUsable(makeJwt({ sub: "auth0|user", exp: now / 1000 + 120 }), now), true);
  assert.equal(isCursorAccessTokenUsable(makeJwt({ sub: "auth0|user", exp: now / 1000 + 30 }), now), false);
  assert.equal(isCursorAccessTokenUsable(makeJwt({ sub: "auth0|bad user", exp: now / 1000 + 120 }), now), false);
  assert.equal(isCursorAccessTokenUsable("not-a-jwt", now), false);
  assert.equal(isCursorAccessTokenUsable(makeJwt({ sub: 123, exp: now / 1000 + 120 }), now), false);
});

test("Cursor discovers the Windows auth file using APPDATA or the roaming home fallback", async () => {
  const { resolveCursorAuthFilePath } = await import("./auth.ts");
  assert.equal(
    resolveCursorAuthFilePath({ APPDATA: "D:\\Roaming" }, "win32", "C:\\Users\\someone"),
    "D:\\Roaming\\Cursor\\auth.json",
  );
  assert.equal(
    resolveCursorAuthFilePath({ APPDATA: "  " }, "win32", "C:\\Users\\someone"),
    "C:\\Users\\someone\\AppData\\Roaming\\Cursor\\auth.json",
  );
});

test("Cursor resolves a Windows auth.json access token to the existing usage cookie", async () => {
  const { resolveCursorAppAuthSession } = await import("./auth.ts");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-auth-"));
  const authFilePath = path.join(dir, "auth.json");
  const dbPath = path.join(dir, "state.vscdb");
  const now = Date.UTC(2026, 0, 1);
  const token = makeJwt({ sub: "auth0|user_123", exp: now / 1000 + 120 });
  try {
    fs.writeFileSync(authFilePath, JSON.stringify({ accessToken: ` ${token} `, refreshToken: "refresh-token" }));
    assert.deepEqual(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32", now }), {
      userId: "user_123",
      cookieHeader: `WorkosCursorSessionToken=user_123%3A%3A${token}`,
      source: "cursor-app",
    });
    assert.equal(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32", now: now + 60_000 }), null);
    assert.equal(fs.existsSync(dbPath), false);
    assert.equal(
      fs.readFileSync(authFilePath, "utf8"),
      JSON.stringify({ accessToken: ` ${token} `, refreshToken: "refresh-token" }),
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Cursor treats missing, unreadable, malformed or refresh-only Windows auth files as unconfigured", async () => {
  const { resolveCursorAppAuthSession } = await import("./auth.ts");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-auth-"));
  const authFilePath = path.join(dir, "auth.json");
  const dbPath = path.join(dir, "state.vscdb");
  try {
    assert.equal(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32" }), null);
    assert.equal(resolveCursorAppAuthSession({ dbPath, authFilePath: dir, platform: "win32" }), null);
    for (const content of [
      "{broken",
      "null",
      "[]",
      "{}",
      '{"accessToken":123}',
      '{"accessToken":" "}',
      '{"refreshToken":"refresh-only"}',
      '{"accessToken":"not-a-jwt"}',
    ]) {
      fs.writeFileSync(authFilePath, content);
      assert.equal(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32" }), null);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Cursor locates the active Windows state database and honors explicit database overrides", async () => {
  const { resolveCursorStateDbPath } = await import("./auth.ts");
  assert.equal(
    resolveCursorStateDbPath({ APPDATA: "D:\\Roaming" }, "win32", "C:\\Users\\someone"),
    "D:\\Roaming\\Cursor\\User\\globalStorage\\state.vscdb",
  );
  assert.equal(
    resolveCursorStateDbPath({}, "win32", "C:\\Users\\someone"),
    "C:\\Users\\someone\\AppData\\Roaming\\Cursor\\User\\globalStorage\\state.vscdb",
  );
  assert.equal(resolveCursorStateDbPath({ CURSOR_STATE_DB_PATH: "override.vscdb" }, "win32"), "override.vscdb");
});

test("Cursor prefers the active Windows database token over a stale or different auth.json login", async () => {
  const { resolveCursorAppAuthSession } = await import("./auth.ts");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-active-db-"));
  const dbPath = path.join(dir, "state.vscdb");
  const authFilePath = path.join(dir, "auth.json");
  const now = Date.UTC(2026, 0, 1);
  const activeToken = makeJwt({ sub: "auth0|active_user", exp: now / 1000 + 3600 });
  const database = new DatabaseSync(dbPath);
  database.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
  database.prepare("INSERT INTO ItemTable VALUES (?, ?)").run("cursorAuth/accessToken", activeToken);
  database.close();
  const originalDatabase = fs.readFileSync(dbPath);
  try {
    for (const expiry of [now / 1000 - 3600, now / 1000 + 3600]) {
      const oldToken = makeJwt({ sub: "auth0|old_file_user", exp: expiry });
      fs.writeFileSync(authFilePath, JSON.stringify({ accessToken: oldToken, refreshToken: oldToken }));
      assert.deepEqual(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32", now }), {
        userId: "active_user",
        cookieHeader: `WorkosCursorSessionToken=active_user%3A%3A${activeToken}`,
        source: "cursor-app",
      });
    }
    assert.deepEqual(fs.readFileSync(dbPath), originalDatabase);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Cursor falls back to auth.json when the Windows state database token is expired or the database is invalid", async () => {
  const { resolveCursorAppAuthSession } = await import("./auth.ts");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-db-fallback-"));
  const dbPath = path.join(dir, "state.vscdb");
  const authFilePath = path.join(dir, "auth.json");
  const now = Date.UTC(2026, 0, 1);
  const fileToken = makeJwt({ sub: "auth0|file_user", exp: now / 1000 + 3600 });
  const database = new DatabaseSync(dbPath);
  database.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
  database
    .prepare("INSERT INTO ItemTable VALUES (?, ?)")
    .run("cursorAuth/accessToken", makeJwt({ sub: "auth0|expired_user", exp: now / 1000 - 3600 }));
  database.close();
  fs.writeFileSync(authFilePath, JSON.stringify({ accessToken: fileToken }));
  try {
    assert.equal(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32", now })?.userId, "file_user");
    fs.writeFileSync(dbPath, "invalid database");
    assert.equal(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32", now })?.userId, "file_user");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("Cursor keeps macOS authentication in the read-only state database", async (t) => {
  const { resolveCursorAppAuthSession } = await import("./auth.ts");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-db-"));
  const dbPath = path.join(dir, "state.vscdb");
  const now = Date.UTC(2026, 0, 1);
  const token = makeJwt({ sub: "auth0|mac_user", exp: now / 1000 + 120 });
  fs.writeFileSync(dbPath, "database fixture");
  t.mock.method(childProcess, "execFileSync", (executable, args, options) => {
    assert.equal(executable, "/usr/bin/sqlite3");
    assert.deepEqual(args, [
      "-readonly",
      dbPath,
      "SELECT value FROM ItemTable WHERE key = 'cursorAuth/accessToken' LIMIT 1;",
    ]);
    assert.equal(options.timeout, 1000);
    return `${token}\n`;
  });
  syncBuiltinESMExports();
  try {
    assert.deepEqual(resolveCursorAppAuthSession({ dbPath, platform: "darwin", now }), {
      userId: "mac_user",
      cookieHeader: `WorkosCursorSessionToken=mac_user%3A%3A${token}`,
      source: "cursor-app",
    });
  } finally {
    t.mock.restoreAll();
    syncBuiltinESMExports();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test(
  "Windows Cursor credential discovery feeds usage requests and preserves the manual cookie override",
  { skip: process.platform !== "win32" },
  async () => {
    const { resolveCursorCredential } = await import("./fetcher.ts");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-appdata-"));
    const previousAppData = process.env.APPDATA;
    const token = makeJwt({ sub: "auth0|user_123", exp: Math.floor(Date.now() / 1000) + 3600 });
    try {
      fs.mkdirSync(path.join(dir, "Cursor"));
      fs.writeFileSync(
        path.join(dir, "Cursor", "auth.json"),
        JSON.stringify({ accessToken: token, refreshToken: "refresh-token" }),
      );
      process.env.APPDATA = dir;
      assert.deepEqual(resolveCursorCredential(), {
        cookieHeader: `WorkosCursorSessionToken=user_123%3A%3A${token}`,
        source: "Cursor",
        requestUsageUserIdFallback: "user_123",
      });
      assert.deepEqual(resolveCursorCredential(" manual-cookie "), {
        cookieHeader: "manual-cookie",
        source: "manual cookie",
        requestUsageUserIdFallback: null,
      });
    } finally {
      if (previousAppData === undefined) delete process.env.APPDATA;
      else process.env.APPDATA = previousAppData;
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
