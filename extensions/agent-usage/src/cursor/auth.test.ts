import test from "node:test";
import assert from "node:assert/strict";

function makeJwt(payload: Record<string, unknown>): string {
  return `header.${Buffer.from(JSON.stringify(payload)).toString("base64url")}.signature`;
}

test("buildCursorCookieHeader derives the WorkOS cookie from Cursor app access token", async () => {
  const { buildCursorCookieHeader } = await import("./auth");
  const token = makeJwt({ sub: "auth0|user_123", exp: Math.floor(Date.now() / 1000) + 3600 });

  assert.equal(buildCursorCookieHeader(token), `WorkosCursorSessionToken=user_123%3A%3A${token}`);
});

test("isCursorAccessTokenUsable rejects expired or malformed Cursor app tokens", async () => {
  const { isCursorAccessTokenUsable } = await import("./auth");
  const now = Date.UTC(2026, 0, 1);

  assert.equal(isCursorAccessTokenUsable(makeJwt({ sub: "auth0|user", exp: now / 1000 + 120 }), now), true);
  assert.equal(isCursorAccessTokenUsable(makeJwt({ sub: "auth0|user", exp: now / 1000 + 30 }), now), false);
  assert.equal(isCursorAccessTokenUsable(makeJwt({ sub: "auth0|bad user", exp: now / 1000 + 120 }), now), false);
  assert.equal(isCursorAccessTokenUsable("not-a-jwt", now), false);
});
