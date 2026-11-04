import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import {
  DEFAULT_CLIENT_ID,
  DeviceCode,
  discoverEndpoints,
  isXaiUrl,
  OAuthEndpoints,
  pollDeviceToken,
  Profile,
  profileFromIdToken,
  refreshTokens,
  requestDeviceCode,
  revokeToken,
  XAI_SCOPES,
} from "../src/lib/oauth.ts"
import { endpoints, fakeFetch, formOf, json, run } from "./support.ts"

const device = new DeviceCode({
  deviceCode: Redacted.make("device-123"),
  userCode: "ABCD-EFGH",
  verificationUri: "https://accounts.x.ai/oauth2/device",
  verificationUriComplete: Option.none(),
  expiresIn: 1800,
  interval: 5,
})

describe("isXaiUrl", () => {
  it("accepts HTTPS on x.ai and its subdomains", () => {
    assert.equal(isXaiUrl("https://auth.x.ai/oauth2/token"), true)
    assert.equal(isXaiUrl("https://x.ai/"), true)
  })

  it("rejects other hosts, look-alikes, and plain HTTP", () => {
    assert.equal(isXaiUrl("http://auth.x.ai/oauth2/token"), false)
    assert.equal(isXaiUrl("https://auth.x.ai.example.com/token"), false)
    assert.equal(isXaiUrl("https://evilx.ai/token"), false)
    assert.equal(isXaiUrl("not a url"), false)
  })
})

describe("discoverEndpoints", () => {
  it("reads the endpoints from the OpenID configuration", async () => {
    const fetch = fakeFetch(() =>
      json({
        device_authorization_endpoint: "https://auth.x.ai/oauth2/device/code",
        token_endpoint: "https://auth.x.ai/oauth2/token",
        revocation_endpoint: "https://auth.x.ai/oauth2/revoke",
      }),
    )
    const discovered = await run(discoverEndpoints("https://auth.x.ai"), fetch)
    assert.ok(discovered instanceof OAuthEndpoints)
    assert.deepEqual({ ...discovered }, { ...endpoints })
    assert.equal(fetch.requests[0]?.url, "https://auth.x.ai/.well-known/openid-configuration")
  })

  it("refuses an endpoint outside x.ai, so a token is never sent there", async () => {
    const fetch = fakeFetch(() =>
      json({
        device_authorization_endpoint: "https://auth.x.ai/oauth2/device/code",
        token_endpoint: "https://attacker.example.com/token",
      }),
    )
    const error = await run(Effect.flip(discoverEndpoints("https://auth.x.ai")), fetch)
    assert.equal(error.code, "invalid_discovery")
  })

  it("reports an unreachable sign-in server as discovery_failed", async () => {
    const fetch = fakeFetch(() => new Response("unavailable", { status: 503 }))
    const error = await run(Effect.flip(discoverEndpoints("https://auth.x.ai")), fetch)
    assert.equal(error.code, "discovery_failed")
    assert.deepEqual(error.status, Option.some(503))
  })
})

describe("requestDeviceCode", () => {
  it("sends the client ID, the scopes, and the referrer", async () => {
    const fetch = fakeFetch(() =>
      json({
        device_code: "device-123",
        user_code: "ABCD-EFGH",
        verification_uri: "https://accounts.x.ai/oauth2/device",
        expires_in: 1800,
        interval: 5,
      }),
    )
    const result = await run(requestDeviceCode(endpoints, DEFAULT_CLIENT_ID), fetch)
    assert.equal(Redacted.value(result.deviceCode), "device-123")
    assert.equal(result.userCode, "ABCD-EFGH")
    assert.equal(result.browserUrl, "https://accounts.x.ai/oauth2/device")
    assert.equal(result.expiresIn, 1800)
    assert.equal(result.interval, 5)
    const sent = formOf(fetch, 0)
    assert.equal(sent.get("client_id"), DEFAULT_CLIENT_ID)
    assert.equal(sent.get("scope"), XAI_SCOPES)
    assert.equal(sent.get("referrer"), "grokcast")
  })

  it("returns the OAuth error code from a refused request", async () => {
    const fetch = fakeFetch(() => json({ error: "invalid_client" }, 401))
    const error = await run(Effect.flip(requestDeviceCode(endpoints, "bad")), fetch)
    assert.equal(error.code, "invalid_client")
    assert.deepEqual(error.status, Option.some(401))
  })
})

describe("pollDeviceToken", () => {
  it("waits while authorization is pending, backs off on slow_down, then returns the tokens", async () => {
    const fetch = fakeFetch((_request, index) => {
      if (index === 0) return json({ error: "authorization_pending" }, 400)
      if (index === 1) return json({ error: "slow_down" }, 400)
      return json({ access_token: "access", refresh_token: "refresh", expires_in: 21600 })
    })
    const requestsAfter = (seconds: number) =>
      TestClock.adjust(`${seconds} seconds`).pipe(
        // Let the HTTP round trip that the clock released finish.
        Effect.andThen(Effect.sleep("10 millis").pipe(TestClock.withLive)),
        Effect.map(() => fetch.requests.length),
      )
    const tokens = await run(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(pollDeviceToken(endpoints, "client", device))
        // 5 s, then 5 s, then 10 s after slow_down.
        assert.equal(yield* requestsAfter(4), 0)
        assert.equal(yield* requestsAfter(1), 1)
        assert.equal(yield* requestsAfter(5), 2)
        assert.equal(yield* requestsAfter(9), 2)
        assert.equal(yield* requestsAfter(1), 3)
        return yield* Fiber.join(fiber)
      }),
      fetch,
    )
    assert.equal(Redacted.value(tokens.access_token), "access")
    assert.deepEqual(Option.map(tokens.refresh_token, Redacted.value), Option.some("refresh"))
    assert.deepEqual(tokens.expires_in, Option.some(21600))
    const sent = formOf(fetch, 2)
    assert.equal(sent.get("grant_type"), "urn:ietf:params:oauth:grant-type:device_code")
    assert.equal(sent.get("device_code"), "device-123")
  })

  it("stops when the user declines", async () => {
    const fetch = fakeFetch(() => json({ error: "access_denied" }, 400))
    const error = await run(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          Effect.flip(pollDeviceToken(endpoints, "client", device)),
        )
        yield* TestClock.adjust("5 seconds")
        return yield* Fiber.join(fiber)
      }),
      fetch,
    )
    assert.equal(error.code, "access_denied")
  })

  it("stops when the code's lifetime has passed", async () => {
    const fetch = fakeFetch(() => json({ error: "authorization_pending" }, 400))
    const error = await run(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(
          Effect.flip(
            pollDeviceToken(endpoints, "client", new DeviceCode({ ...device, expiresIn: 10 })),
          ),
        )
        yield* TestClock.adjust("10 seconds")
        return yield* Fiber.join(fiber)
      }),
      fetch,
    )
    assert.equal(error.code, "expired_token")
  })

  it("stops when interrupted", async () => {
    const fetch = fakeFetch(() => json({ error: "authorization_pending" }, 400))
    const exit = await run(
      Effect.gen(function* () {
        const fiber = yield* Effect.forkChild(pollDeviceToken(endpoints, "client", device))
        yield* Fiber.interrupt(fiber)
        return yield* Fiber.await(fiber)
      }),
      fetch,
    )
    assert.equal(exit._tag, "Failure")
    assert.equal(fetch.requests.length, 0)
  })
})

describe("refreshTokens", () => {
  it("sends a refresh_token grant", async () => {
    const fetch = fakeFetch(() =>
      json({ access_token: "new-access", refresh_token: "new-refresh", expires_in: 21600 }),
    )
    const tokens = await run(
      refreshTokens(endpoints, "client", Redacted.make("old-refresh")),
      fetch,
    )
    assert.deepEqual(Option.map(tokens.refresh_token, Redacted.value), Option.some("new-refresh"))
    const sent = formOf(fetch, 0)
    assert.equal(sent.get("grant_type"), "refresh_token")
    assert.equal(sent.get("refresh_token"), "old-refresh")
  })

  it("reports invalid_grant for a spent refresh token", async () => {
    const fetch = fakeFetch(() => json({ error: "invalid_grant" }, 400))
    const error = await run(
      Effect.flip(refreshTokens(endpoints, "client", Redacted.make("spent"))),
      fetch,
    )
    assert.equal(error._tag, "OAuthError")
    assert.equal(error.code, "invalid_grant")
  })

  it("rejects a response with no access token", async () => {
    const fetch = fakeFetch(() => json({ token_type: "Bearer" }))
    const error = await run(
      Effect.flip(refreshTokens(endpoints, "client", Redacted.make("refresh"))),
      fetch,
    )
    assert.equal(error.code, "invalid_token_response")
  })

  it("keeps tokens out of error messages", async () => {
    const fetch = fakeFetch(() => json({ access_token: "secret-access", expires_in: "soon" }))
    const error = await run(
      Effect.flip(refreshTokens(endpoints, "client", Redacted.make("secret-refresh"))),
      fetch,
    )
    assert.doesNotMatch(String(error), /secret/)
  })
})

describe("revokeToken", () => {
  it("posts the token to the revocation endpoint", async () => {
    const fetch = fakeFetch(() => new Response(null, { status: 200 }))
    await run(revokeToken(endpoints, "client", Redacted.make("refresh")), fetch)
    assert.equal(fetch.requests[0]?.url, "https://auth.x.ai/oauth2/revoke")
    assert.equal(formOf(fetch, 0).get("token"), "refresh")
  })

  it("does nothing when the server has no revocation endpoint", async () => {
    const fetch = fakeFetch(() => new Response(null, { status: 200 }))
    const noRevocation = new OAuthEndpoints({ ...endpoints, revocation: Option.none() })
    await run(revokeToken(noRevocation, "client", Redacted.make("refresh")), fetch)
    assert.equal(fetch.requests.length, 0)
  })
})

describe("profileFromIdToken", () => {
  const idToken = (payload: string) => Option.some(Redacted.make(`header.${payload}.signature`))
  const claims = (json: string) => idToken(Buffer.from(json).toString("base64url"))

  it("reads the name and email claims", () => {
    assert.deepEqual(
      profileFromIdToken(claims('{"name":"Ada","email":"me@example.com","sub":"1"}')),
      new Profile({ name: Option.some("Ada"), email: Option.some("me@example.com") }),
    )
  })

  it("keeps the claims that are there", () => {
    assert.deepEqual(
      profileFromIdToken(claims('{"email":"me@example.com"}')),
      new Profile({ name: Option.none(), email: Option.some("me@example.com") }),
    )
  })

  it("knows nobody for a missing or malformed token", () => {
    assert.deepEqual(profileFromIdToken(Option.none()), Profile.unknown)
    assert.deepEqual(profileFromIdToken(Option.some(Redacted.make("not-a-jwt"))), Profile.unknown)
    assert.deepEqual(profileFromIdToken(idToken("%%%")), Profile.unknown)
  })
})
