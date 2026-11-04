import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import {
  GrokSession,
  NotSignedInError,
  REFRESH_MARGIN_MS,
  StoredTokens,
  toStoredTokens,
} from "../src/lib/session.ts"
import {
  endpoints,
  fakeFetch,
  formOf,
  json,
  memoryStore,
  NOW,
  run,
  type MemoryStore,
} from "./support.ts"

const HOUR = 3_600_000

function tokens(accessToken: string, refreshToken: string, expiresAt: number): StoredTokens {
  return new StoredTokens({
    accessToken: Redacted.make(accessToken),
    refreshToken: Option.some(Redacted.make(refreshToken)),
    idToken: Option.none(),
    expiresAt,
  })
}

/** The stored tokens as plain strings, for comparison. */
function plain(store: MemoryStore) {
  return Option.map(store.current, (stored) => ({
    accessToken: Redacted.value(stored.accessToken),
    refreshToken: Option.getOrUndefined(Option.map(stored.refreshToken, Redacted.value)),
    expiresAt: stored.expiresAt,
  }))
}

const accessToken = GrokSession.use((session) => session.accessToken).pipe(
  Effect.map(Redacted.value),
)

describe("toStoredTokens", () => {
  const response = (refresh: Option.Option<string>) => ({
    access_token: Redacted.make("a2"),
    refresh_token: Option.map(refresh, Redacted.make),
    id_token: Option.none(),
    expires_in: Option.some(21600),
  })

  it("stores the rotated refresh token", () => {
    const stored = toStoredTokens(
      response(Option.some("r2")),
      NOW,
      Option.some(tokens("a1", "r1", NOW)),
    )
    assert.equal(Redacted.value(stored.accessToken), "a2")
    assert.deepEqual(Option.map(stored.refreshToken, Redacted.value), Option.some("r2"))
    assert.equal(stored.expiresAt, NOW + 21600 * 1000)
  })

  it("keeps the previous refresh token when the response has none", () => {
    const stored = toStoredTokens(
      response(Option.none()),
      NOW,
      Option.some(tokens("a1", "r1", NOW)),
    )
    assert.deepEqual(Option.map(stored.refreshToken, Redacted.value), Option.some("r1"))
  })
})

describe("GrokSession.accessToken", () => {
  it("returns the stored token while it is fresh", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW + HOUR))
    const fetch = fakeFetch(() => json({}))
    assert.equal(await run(accessToken, fetch, store), "a1")
    assert.equal(fetch.requests.length, 0)
  })

  it("refreshes within five minutes of expiry and saves the rotated tokens", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW + REFRESH_MARGIN_MS - 1))
    const fetch = fakeFetch(() =>
      json({ access_token: "a2", refresh_token: "r2", expires_in: 21600 }),
    )
    assert.equal(await run(accessToken, fetch, store), "a2")
    assert.deepEqual(
      plain(store),
      Option.some({ accessToken: "a2", refreshToken: "r2", expiresAt: NOW + 21600 * 1000 }),
    )
  })

  it("fails with NotSignedInError when nothing is stored", async () => {
    const error = await run(
      Effect.flip(accessToken),
      fakeFetch(() => json({})),
    )
    assert.equal(error._tag, "NotSignedInError")
  })

  it("shares one refresh between concurrent callers", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW))
    const fetch = fakeFetch(() =>
      json({ access_token: "a2", refresh_token: "r2", expires_in: 21600 }),
    )
    const results = await run(
      Effect.all([accessToken, accessToken, accessToken], { concurrency: "unbounded" }),
      fetch,
      store,
    )
    assert.deepEqual(results, ["a2", "a2", "a2"])
    assert.equal(fetch.requests.length, 1)
  })

  it("uses tokens another command already refreshed when its own refresh token was spent", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW))
    const fetch = fakeFetch(() => {
      // Another process refreshed first and saved r2, so r1 is now spent.
      store.current = Option.some(tokens("a2", "r2", NOW + 6 * HOUR))
      return json({ error: "invalid_grant" }, 400)
    })
    assert.equal(await run(accessToken, fetch, store), "a2")
  })

  it("clears the sign-in when the refresh token is rejected", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW))
    const fetch = fakeFetch(() => json({ error: "invalid_grant" }, 400))
    const error = await run(Effect.flip(accessToken), fetch, store)
    assert.equal(error._tag, "NotSignedInError")
    assert.deepEqual(store.current, Option.none())
  })

  it("keeps the sign-in on a server error", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW))
    const fetch = fakeFetch(() => json({ error: "server_error" }, 503))
    const error = await run(Effect.flip(accessToken), fetch, store)
    assert.equal(error._tag === "OAuthError" && error.code, "server_error")
    assert.equal(Option.getOrUndefined(plain(store))?.refreshToken, "r1")
  })
})

describe("GrokSession.fetch", () => {
  const sessionFetch = (input: string | Request, init?: RequestInit) =>
    GrokSession.use((session) => Effect.tryPromise(() => session.fetch(input, init)))

  it("sets the bearer token and keeps the request", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW + HOUR))
    const fetch = fakeFetch(() => json({ text: "hello" }))
    const response = await run(
      sessionFetch("https://api.x.ai/v1/stt", {
        method: "POST",
        headers: { "x-test": "yes" },
        body: "audio",
      }),
      fetch,
      store,
    )
    assert.equal(response.status, 200)
    assert.equal(fetch.requests[0]?.headers.get("authorization"), "Bearer a1")
    assert.equal(fetch.requests[0]?.headers.get("x-test"), "yes")
    assert.equal(fetch.requests[0]?.body, "audio")
  })

  it("accepts a Request, as the xAI SDK passes one", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW + HOUR))
    const fetch = fakeFetch(() => json({}))
    await run(
      sessionFetch(new Request("https://api.x.ai/v1/tts", { method: "POST", body: "{}" })),
      fetch,
      store,
    )
    assert.equal(fetch.requests[0]?.method, "POST")
    assert.equal(fetch.requests[0]?.headers.get("authorization"), "Bearer a1")
  })

  it("refreshes once on a 401 and retries with the same body", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW + HOUR))
    const fetch = fakeFetch((request) => {
      if (request.url.endsWith("/oauth2/token")) {
        return json({ access_token: "a2", refresh_token: "r2", expires_in: 21600 })
      }
      return request.headers.get("authorization") === "Bearer a2"
        ? json({ ok: "yes" })
        : json({ error: "unauthorized" }, 401)
    })
    const response = await run(
      sessionFetch("https://api.x.ai/v1/stt", { method: "POST", body: "audio" }),
      fetch,
      store,
    )
    assert.equal(response.status, 200)
    assert.deepEqual(
      fetch.requests.map((request) => request.url),
      ["https://api.x.ai/v1/stt", endpoints.token, "https://api.x.ai/v1/stt"],
    )
    assert.equal(fetch.requests[2]?.body, "audio")
  })

  it("rejects with NotSignedInError when nobody is signed in", async () => {
    const fetch = fakeFetch(() => json({}))
    const error = await run(Effect.flip(sessionFetch("https://api.x.ai/v1/stt")), fetch)
    assert.ok(error.cause instanceof NotSignedInError)
    assert.equal(fetch.requests.length, 0)
  })
})

describe("GrokSession.signOut", () => {
  const signOut = GrokSession.use((session) => session.signOut)

  it("revokes the refresh token and clears local tokens", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW + HOUR))
    const fetch = fakeFetch(() => new Response(null, { status: 200 }))
    assert.equal(await run(signOut, fetch, store), true)
    assert.equal(formOf(fetch, 0).get("token"), "r1")
    assert.deepEqual(store.current, Option.none())
  })

  it("clears local tokens even when the revoke fails", async () => {
    const store = memoryStore(tokens("a1", "r1", NOW + HOUR))
    const fetch = fakeFetch(() => json({ error: "server_error" }, 500))
    const error = await run(Effect.flip(signOut), fetch, store)
    assert.equal(error._tag, "OAuthError")
    assert.deepEqual(store.current, Option.none())
  })

  it("returns false when nobody is signed in", async () => {
    assert.equal(
      await run(
        signOut,
        fakeFetch(() => json({})),
      ),
      false,
    )
  })
})
