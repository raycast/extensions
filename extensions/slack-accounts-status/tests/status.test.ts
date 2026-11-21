import assert from "node:assert/strict";
import { test } from "vitest";
import { applyToAccount } from "../src/apply";
import {
  Account,
  clearStatusPreset,
  createStatusRequest,
  defaultPresets,
  expirationFor,
  isPreset,
  Preset,
  StatusRequest,
} from "../src/domain";
import { parseIdentity, parseUserTokens, requiredScopes, requireScopes, SlackError, slackRequest } from "../src/slack";
import { freshAccessToken } from "../src/tokens";
import type { OAuth } from "@raycast/api";

const now = new Date("2026-11-04T18:00:00Z");
const account: Account = {
  id: "T1:U1",
  teamId: "T1",
  teamName: "Test Workspace",
  userId: "U1",
  userName: "test-user",
  providerId: "slack-test",
  clientId: "123.456",
  state: "ready",
};
const preset: Preset = {
  id: "test",
  name: "Test",
  text: "Deep work",
  emoji: ":headphones:",
  duration: "60",
  customMinutes: "60",
  presence: "keep",
  notifications: "pause",
};
const request = createStatusRequest(preset, null, now);

test("Focused uses a one-hour status and notification pause without changing presence", () => {
  assert.deepEqual(createStatusRequest(defaultPresets[0], null, now), {
    profile: { status_text: "Focusing", status_emoji: ":dart:", status_expiration: 1793818800 },
    presence: "keep",
    notifications: "pause",
  });
});

test("Clear Status removes text and emoji without changing presence or notifications", async () => {
  const calls: Array<[string, Record<string, unknown>]> = [];
  const result = await applyToAccount(
    account,
    createStatusRequest(clearStatusPreset, null, now),
    async () => "user-token",
    undefined,
    async (method, token, payload) => {
      assert.equal(token, "user-token");
      calls.push([method, payload]);
    },
    () => now.getTime(),
  );
  assert.deepEqual(calls, [
    ["users.profile.set", { profile: { status_text: "", status_emoji: "", status_expiration: 0 } }],
  ]);
  assert.deepEqual(result.changes, [{ operation: "status", ok: true }]);
});

test.each([
  { id: "commuting", emoji: ":bus:", minutes: 30 },
  { id: "lunch", emoji: ":green_salad:", minutes: 60 },
])("$id sends its emoji and pauses notifications for $minutes minutes", async ({ id, emoji, minutes }) => {
  const defaultPreset = defaultPresets.find((preset) => preset.id === id);
  assert.ok(defaultPreset);
  const request = createStatusRequest(defaultPreset, null, now);
  assert.equal(request.profile.status_emoji, emoji);
  const notificationCalls: Array<[string, Record<string, unknown>]> = [];
  await applyToAccount(
    account,
    request,
    async () => "user-token",
    undefined,
    async (method, _token, payload) => {
      if (method.startsWith("dnd.")) notificationCalls.push([method, payload]);
    },
    () => now.getTime(),
  );
  assert.deepEqual(notificationCalls, [["dnd.setSnooze", { num_minutes: minutes }]]);
});

test.each(["auto", "away"] as const)(
  "Quick presence %s leaves the profile and notifications alone",
  async (presence) => {
    const calls: Array<[string, Record<string, unknown>]> = [];
    const result = await applyToAccount(
      account,
      { presence, notifications: "keep" },
      async () => "user-token",
      undefined,
      async (method, _token, payload) => {
        calls.push([method, payload]);
      },
    );
    assert.deepEqual(calls, [["users.setPresence", { presence }]]);
    assert.deepEqual(result.changes, [{ operation: "presence", ok: true }]);
  },
);

test("Custom minutes and a selected date produce explicit expiry timestamps", () => {
  assert.equal(expirationFor("custom", "90", null, now), 1793820600);
  assert.equal(expirationFor("until", "", new Date("2026-11-04T20:30:00Z"), now), 1793824200);
  assert.equal(expirationFor("never", "", null, now), 0);
});

test("Today ends at the user's next local midnight", () => {
  const local = new Date(2026, 10, 4, 23, 15);
  assert.equal(expirationFor("today", "", null, local), new Date(2026, 10, 5, 0, 0).getTime() / 1000);
});

test("Invalid durations and expired dates cannot produce a request", () => {
  for (const minutes of ["", "0", "-1", "1.5", "NaN", "Infinity", "525601"])
    assert.throws(() => expirationFor("custom", minutes, null, now));
  assert.throws(() => expirationFor("until", "", null, now), /Choose an expiration/);
  assert.throws(() => expirationFor("until", "", now, now), /future/);
  assert.throws(() => expirationFor("until", "", new Date("invalid"), now), /future/);
  assert.throws(() => createStatusRequest({ ...preset, duration: "never" }, null, now), /finite pause/);
});

test("Status character limit counts Unicode characters and validates Slack shortcodes", () => {
  assert.equal(createStatusRequest({ ...preset, text: "😀".repeat(100) }, null, now).profile.status_text.length, 200);
  assert.throws(() => createStatusRequest({ ...preset, text: "a".repeat(101) }, null, now), /100 characters/);
  assert.throws(() => createStatusRequest({ ...preset, emoji: "coffee" }, null, now), /shortcode/);
  assert.equal(createStatusRequest({ ...preset, emoji: ":+1:" }, null, now).profile.status_emoji, ":+1:");
});

test("Stored preset validation rejects a number where a duration string is required", () => {
  assert.equal(isPreset(preset), true);
  assert.equal(isPreset({ ...preset, duration: 60 }), false);
});

test("A failed status does not hide successful presence and notification updates", async () => {
  const changed: string[] = [];
  const result = await applyToAccount(
    account,
    { ...request, presence: "away" },
    async () => "user-token",
    undefined,
    async (method) => {
      changed.push(method);
      if (method === "users.profile.set") throw new SlackError("invalid_emoji");
    },
    () => now.getTime(),
  );
  assert.deepEqual(changed, ["users.profile.set", "users.setPresence", "dnd.setSnooze"]);
  assert.deepEqual(
    result.changes.map((change) => [change.operation, change.ok]),
    [
      ["status", false],
      ["presence", true],
      ["notifications", true],
    ],
  );
  assert.match(result.changes[0].error ?? "", /emoji/);
});

test("Retry skips successful changes and keeps the original expiry", async () => {
  const first = await applyToAccount(
    account,
    request,
    async () => "user-token",
    undefined,
    async (method) => {
      if (method === "dnd.setSnooze") throw new SlackError("ratelimited");
    },
    () => now.getTime(),
  );
  const calls: Array<[string, Record<string, unknown>]> = [];
  const retried = await applyToAccount(
    account,
    request,
    async () => "user-token",
    first,
    async (method, _token, payload) => {
      calls.push([method, payload]);
    },
    () => now.getTime() + 15 * 60000,
  );
  assert.deepEqual(calls, [["dnd.setSnooze", { num_minutes: 45 }]]);
  assert.equal(
    retried.changes.every((change) => change.ok),
    true,
  );
  assert.equal(request.profile.status_expiration, 1793818800);
});

test("Expired retries leave successful changes intact and make no API calls", async () => {
  const previous = {
    account,
    changes: [
      { operation: "status" as const, ok: true },
      { operation: "notifications" as const, ok: false, error: "Rate limited" },
    ],
  };
  const result = await applyToAccount(
    account,
    request,
    async () => {
      throw new Error("Should not load credentials");
    },
    previous,
    async () => {
      assert.fail("Should not write to Slack");
    },
    () => now.getTime() + 3600000,
  );
  assert.deepEqual(result.changes[0], { operation: "status", ok: true });
  assert.match(result.changes[1].error ?? "", /expired/);
});

test("Missing credentials report all requested operations without writing", async () => {
  const result = await applyToAccount(
    account,
    request,
    async () => {
      throw new Error("Reconnect this workspace");
    },
    undefined,
    async () => {
      assert.fail("Should not write to Slack");
    },
    () => now.getTime(),
  );
  assert.deepEqual(
    result.changes.map((change) => [change.operation, change.ok, change.error]),
    [
      ["status", false, "Reconnect this workspace"],
      ["notifications", false, "Reconnect this workspace"],
    ],
  );
});

test("Different workspaces retain independent outcomes", async () => {
  const second = { ...account, id: "T2:U2", teamId: "T2", userId: "U2" };
  const results = await Promise.all(
    [account, second].map((target) =>
      applyToAccount(
        target,
        request,
        async () => target.teamId,
        undefined,
        async (_method, token) => {
          if (token === "T2") throw new SlackError("missing_scope");
        },
        () => now.getTime(),
      ),
    ),
  );
  assert.equal(
    results[0].changes.every((change) => change.ok),
    true,
  );
  assert.equal(
    results[1].changes.every((change) => !change.ok),
    true,
  );
});

test("Notification pauses round up to whole minutes without becoming indefinite", async () => {
  let pausedFor: unknown;
  await applyToAccount(
    account,
    request,
    async () => "user-token",
    undefined,
    async (method, _token, payload) => {
      if (method === "dnd.setSnooze") pausedFor = payload.num_minutes;
    },
    () => now.getTime() + 3501000,
  );
  assert.equal(pausedFor, 2);
});

test("Initial OAuth selects the nested user token instead of a top-level bot token", () => {
  assert.deepEqual(
    parseUserTokens({
      access_token: "bot-token",
      token_type: "bot",
      authed_user: {
        access_token: "user-token",
        token_type: "user",
        scope: requiredScopes.join(","),
        refresh_token: "user-refresh",
        expires_in: 43200,
      },
    }),
    { accessToken: "user-token", refreshToken: "user-refresh", expiresIn: 43200, scope: requiredScopes.join(",") },
  );
  assert.throws(() => parseUserTokens({ access_token: "bot-token", token_type: "bot" }), /user token/);
});

test("Rotating user tokens require valid expiration and a refresh token", () => {
  assert.throws(
    () => parseUserTokens({ access_token: "user-token", token_type: "user", expires_in: 43200 }),
    /refresh token/,
  );
  assert.throws(
    () => parseUserTokens({ access_token: "user-token", token_type: "user", expires_in: -1, refresh_token: "refresh" }),
    /expiration/,
  );
  requireScopes(requiredScopes.join(","));
  assert.throws(() => requireScopes("users.profile:write"), /required/);
});

test("Account identity must name a real workspace user", () => {
  assert.deepEqual(parseIdentity({ team_id: "T1", team: "Team", user_id: "U1", user: "test" }), {
    teamId: "T1",
    teamName: "Team",
    userId: "U1",
    userName: "test",
  });
  assert.throws(() => parseIdentity({ team_id: "T1", user_id: "U1", bot_id: "B1" }), /workspace user/);
  assert.throws(() => parseIdentity({ user_id: "U1" }), /workspace user/);
});

test("Slack requests carry credentials only in the header and keep the profile payload", async () => {
  const fetcher: typeof fetch = async (url, options) => {
    assert.equal(url, "https://slack.com/api/users.profile.set");
    assert.deepEqual(options?.headers, {
      Authorization: "Bearer private-user-token",
      "Content-Type": "application/json; charset=utf-8",
    });
    assert.deepEqual(JSON.parse(String(options?.body)), { profile: request.profile });
    assert.equal(String(url).includes("private-user-token"), false);
    return Response.json({ ok: true });
  };
  await slackRequest("users.profile.set", "private-user-token", { profile: request.profile }, fetcher);
});

test("HTTP 200 Slack errors and HTTP 429 rate limits stay failures", async () => {
  await assert.rejects(
    slackRequest("users.profile.set", "token", {}, async () => Response.json({ ok: false, error: "missing_scope" })),
    /required/,
  );
  await assert.rejects(
    slackRequest(
      "users.profile.set",
      "token",
      {},
      async () => new Response("Too many requests", { status: 429, headers: { "retry-after": "30" } }),
    ),
    /Retry after 30 seconds/,
  );
  await assert.rejects(
    slackRequest(
      "users.profile.set",
      "token",
      {},
      async () => new Response("Upstream error with sensitive content", { status: 500 }),
    ),
    /HTTP 500/,
  );
});

test("Unreadable and network responses never expose response bodies or credentials", async () => {
  await assert.rejects(
    slackRequest("auth.test", "secret-token", {}, async () => new Response("secret-token")),
    (error: Error) => !error.message.includes("secret-token") && /unreadable/.test(error.message),
  );
  await assert.rejects(
    slackRequest("auth.test", "secret-token", {}, async () => {
      throw new Error("secret-token");
    }),
    (error: Error) => !error.message.includes("secret-token") && /Could not reach Slack/.test(error.message),
  );
});

function storedTokens(expired: boolean): OAuth.TokenSet {
  return {
    accessToken: "old-user-token",
    refreshToken: "old-refresh-token",
    scope: requiredScopes.join(","),
    expiresIn: 43200,
    updatedAt: now,
    isExpired: () => expired,
  };
}

test("A valid access token does not trigger refresh or rewrite credentials", async () => {
  const token = await freshAccessToken(
    "123.456",
    {
      getTokens: async () => storedTokens(false),
      setTokens: async () => {
        assert.fail("Should not store unchanged credentials");
      },
    },
    async () => {
      assert.fail("Should not refresh an unexpired token");
    },
  );
  assert.equal(token, "old-user-token");
});

test("Refresh sends no client secret and persists the rotated user token before using it", async () => {
  const order: string[] = [];
  let saved: OAuth.TokenSetOptions | OAuth.TokenResponse | undefined;
  const token = await freshAccessToken(
    "123.456",
    {
      getTokens: async () => storedTokens(true),
      setTokens: async (tokens) => {
        order.push("persist");
        saved = tokens;
      },
    },
    async (method, bearer, payload) => {
      assert.equal(method, "oauth.v2.access");
      assert.equal(bearer, undefined);
      assert.ok(payload instanceof URLSearchParams);
      assert.deepEqual(Object.fromEntries(payload), {
        client_id: "123.456",
        grant_type: "refresh_token",
        refresh_token: "old-refresh-token",
      });
      order.push("refresh");
      return {
        ok: true,
        access_token: "rotated-user-token",
        refresh_token: "rotated-refresh-token",
        token_type: "user",
        expires_in: 43200,
        scope: requiredScopes.join(","),
      };
    },
  );
  assert.deepEqual(order, ["refresh", "persist"]);
  assert.equal(token, "rotated-user-token");
  assert.deepEqual(saved, {
    accessToken: "rotated-user-token",
    refreshToken: "rotated-refresh-token",
    expiresIn: 43200,
    scope: requiredScopes.join(","),
  });
});

test("Missing or expired connections never refresh without a refresh token", async () => {
  await assert.rejects(
    freshAccessToken("123.456", { getTokens: async () => undefined, setTokens: async () => {} }),
    /Reconnect/,
  );
  await assert.rejects(
    freshAccessToken("123.456", {
      getTokens: async () => ({ ...storedTokens(true), refreshToken: undefined }),
      setTokens: async () => {},
    }),
    /expired/,
  );
});
