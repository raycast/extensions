import assert from "node:assert/strict";
import childProcess from "node:child_process";
import fs from "node:fs";
import { syncBuiltinESMExports } from "node:module";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";

test("getCursorNotConfiguredMessage distinguishes non-JWT tokens from missing tokens", async () => {
  const { getCursorNotConfiguredMessage } = await import("./fetcher.ts");

  // No token at all — standard "not configured" message
  assert.equal(
    getCursorNotConfiguredMessage(null),
    "Cursor is not configured. Sign in to Cursor, or paste a cursor.com Cookie header in extension settings.",
  );

  // JWT token that failed for another reason (e.g. expired) — standard message
  const jwt = `header.${Buffer.from(JSON.stringify({ sub: "auth0|user", exp: 123 })).toString("base64url")}.sig`;
  assert.equal(
    getCursorNotConfiguredMessage(jwt),
    "Cursor is not configured. Sign in to Cursor, or paste a cursor.com Cookie header in extension settings.",
  );

  // Non-JWT token (Cursor 3.27+ format) — helpful message pointing to Cookie header fallback
  const nonJwt = "YWJjOjEyMzp4eXo6dG9rZW4=";
  const message = getCursorNotConfiguredMessage(nonJwt);
  assert.ok(message.includes("not supported"), `expected "not supported" in: ${message}`);
  assert.ok(message.includes("Cookie header"), `expected "Cookie header" in: ${message}`);
});

test("Cursor reports unsupported Windows database tokens when auth.json is absent without accepting them", async () => {
  const { readCursorAppAccessToken, resolveCursorAppAuthSession } = await import("./auth.ts");
  const { getCursorNotConfiguredMessage } = await import("./fetcher.ts");
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-unsupported-db-"));
  const dbPath = path.join(dir, "state.vscdb");
  const authFilePath = path.join(dir, "auth.json");
  const token = "YWJjOjEyMzp4eXo6dG9rZW4=";
  const database = new DatabaseSync(dbPath);
  database.exec("CREATE TABLE ItemTable (key TEXT PRIMARY KEY, value TEXT)");
  database.prepare("INSERT INTO ItemTable VALUES (?, ?)").run("cursorAuth/accessToken", token);
  database.close();
  try {
    assert.equal(resolveCursorAppAuthSession({ dbPath, authFilePath, platform: "win32" }), null);
    const appToken = readCursorAppAccessToken(dbPath, authFilePath, "win32");
    assert.equal(appToken, token);
    assert.match(getCursorNotConfiguredMessage(appToken), /not supported/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test(
  "fetchCursorUsage reads unsupported macOS credentials only once and sends no requests",
  { skip: process.platform === "win32" },
  async (t) => {
    const { fetchCursorUsage } = await import("./fetcher.ts");
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cursor-single-read-"));
    const dbPath = path.join(dir, "state.vscdb");
    const previousDbPath = process.env.TEST_CURSOR_STATE_DB_PATH;
    fs.writeFileSync(dbPath, "database fixture");
    const readDatabase = t.mock.method(childProcess, "execFileSync", () => "YWJjOjEyMzp4eXo6dG9rZW4=\n");
    const fetch = t.mock.method(globalThis, "fetch", () => {
      throw new Error("Unsupported tokens must not be sent to Cursor");
    });
    syncBuiltinESMExports();
    try {
      process.env.TEST_CURSOR_STATE_DB_PATH = dbPath;
      const { usage, error } = await fetchCursorUsage();
      assert.equal(usage, null);
      assert.equal(error?.type, "not_configured");
      assert.match(error?.message ?? "", /not supported/);
      assert.equal(readDatabase.mock.callCount(), 1);
      assert.equal(fetch.mock.callCount(), 0);
    } finally {
      if (previousDbPath === undefined) delete process.env.TEST_CURSOR_STATE_DB_PATH;
      else process.env.TEST_CURSOR_STATE_DB_PATH = previousDbPath;
      t.mock.restoreAll();
      syncBuiltinESMExports();
      fs.rmSync(dir, { recursive: true, force: true });
    }
  },
);
