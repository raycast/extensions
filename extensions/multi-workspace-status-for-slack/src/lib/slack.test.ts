import assert from "node:assert/strict";
import { afterEach, test } from "node:test";
import { expirationFor } from "./expiration.ts";
import { clearStatus, normalizeEmoji, setStatus, summarize, verifyToken } from "./slack.ts";

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
});

const ws = (name: string, token: string) => ({ teamId: `T${name}`, name, user: "me", token });

function mockSlack(handler: (token: string) => object, headers: Record<string, string> = {}) {
  const calls: { url: string; token: string; body: { profile: Record<string, unknown> } }[] = [];
  globalThis.fetch = (async (url: string, init: RequestInit) => {
    const token = String((init.headers as Record<string, string>).Authorization).replace("Bearer ", "");
    const body = JSON.parse(String(init.body));
    calls.push({ url, token, body });
    return new Response(JSON.stringify(handler(token)), { status: 200, headers });
  }) as typeof fetch;
  return calls;
}

test("normalizeEmoji adds colons and handles empty input", () => {
  assert.equal(normalizeEmoji("palm_tree"), ":palm_tree:");
  assert.equal(normalizeEmoji(" :palm_tree: "), ":palm_tree:");
  assert.equal(normalizeEmoji("  "), "");
});

test("setStatus sends one status to every workspace with its own token", async () => {
  const calls = mockSlack(() => ({ ok: true }));
  const results = await setStatus([ws("A", "xoxp-a"), ws("B", "xoxp-b")], { emoji: ":x:", text: "Hi", expiration: 42 });
  assert.deepEqual(calls.map((c) => c.token).sort(), ["xoxp-a", "xoxp-b"]);
  assert.ok(calls.every((c) => c.url.endsWith("/users.profile.set")));
  assert.deepEqual(calls[0].body, { profile: { status_emoji: ":x:", status_text: "Hi", status_expiration: 42 } });
  assert.ok(results.every((r) => !r.error));
});

test("one failing workspace does not stop the others and is reported", async () => {
  mockSlack((token) =>
    token === "xoxp-b" ? { ok: false, error: "profile_status_set_failed_not_valid_emoji" } : { ok: true },
  );
  const results = await setStatus([ws("A", "xoxp-a"), ws("B", "xoxp-b"), ws("C", "xoxp-c")], {
    emoji: ":x:",
    text: "",
    expiration: 0,
  });
  assert.deepEqual(
    results.map((r) => Boolean(r.error)),
    [false, true, false],
  );
  assert.equal(summarize(results), "B: Emoji doesn't exist in this workspace");
});

test("network errors are reported per workspace", async () => {
  globalThis.fetch = (async () => {
    throw new Error("offline");
  }) as typeof fetch;
  const [result] = await setStatus([ws("A", "xoxp-a")], { emoji: "", text: "x", expiration: 0 });
  assert.equal(result.error, "offline");
});

test("clearStatus sends empty values", async () => {
  const calls = mockSlack(() => ({ ok: true }));
  await clearStatus([ws("A", "xoxp-a")]);
  assert.deepEqual(calls[0].body.profile, { status_emoji: "", status_text: "", status_expiration: 0 });
});

test("verifyToken rejects non-user tokens without calling Slack", async () => {
  const calls = mockSlack(() => ({ ok: true }));
  await assert.rejects(verifyToken("xoxb-123"), /xoxp/);
  assert.equal(calls.length, 0);
});

test("verifyToken rejects tokens without the write scope", async () => {
  mockSlack(() => ({ ok: true, team: "A", team_id: "T1", user: "me" }), { "x-oauth-scopes": "users.profile:read" });
  await assert.rejects(verifyToken("xoxp-1"), /users\.profile:write/);
});

test("verifyToken returns workspace details", async () => {
  mockSlack(() => ({ ok: true, team: "Buff", team_id: "T1", user: "me" }), { "x-oauth-scopes": "users.profile:write" });
  assert.deepEqual(await verifyToken(" xoxp-1 "), { teamId: "T1", name: "Buff", user: "me", token: "xoxp-1" });
});

test("expirationFor computes durations", () => {
  const now = new Date(2026, 10, 4, 10, 0, 0); // Wednesday
  const seconds = Math.floor(now.getTime() / 1000);
  assert.equal(expirationFor("none", now), 0);
  assert.equal(expirationFor("30m", now), seconds + 1800);
  assert.equal(expirationFor("today", now), Math.floor(new Date(2026, 10, 4, 23, 59, 59).getTime() / 1000));
  assert.equal(expirationFor("week", now), Math.floor(new Date(2026, 10, 8, 23, 59, 59).getTime() / 1000));
  const sunday = new Date(2026, 10, 8, 10, 0, 0);
  assert.equal(expirationFor("week", sunday), Math.floor(new Date(2026, 10, 8, 23, 59, 59).getTime() / 1000));
});
