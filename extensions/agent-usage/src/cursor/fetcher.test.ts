import assert from "node:assert/strict";
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
