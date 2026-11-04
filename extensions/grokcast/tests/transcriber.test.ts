import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as P from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as TestClock from "effect/testing/TestClock"
import { StoredTokens } from "../src/lib/session.ts"
import { Transcriber, type TranscribeOptions } from "../src/lib/transcriber.ts"
import {
  fakeFetch,
  json,
  memoryStore,
  NOW,
  testLayer,
  type FakeFetch,
  type MemoryStore,
} from "./support.ts"

const signedIn = () =>
  memoryStore(
    new StoredTokens({
      accessToken: Redacted.make("a1"),
      refreshToken: Option.some(Redacted.make("r1")),
      idToken: Option.none(),
      expiresAt: NOW + 3_600_000,
    }),
  )

const english: TranscribeOptions = { language: Option.some("en"), formatNumbers: true }

const transcribe = (
  fetch: FakeFetch,
  store: MemoryStore,
  options: TranscribeOptions = english,
  audio = new Uint8Array([1, 2, 3, 4]),
) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(Transcriber.use((transcriber) => transcriber.transcribe(audio, options))),
      Effect.provide(Transcriber.layer.pipe(Layer.provideMerge(testLayer(fetch, store)))),
    ),
  )

const transcribeError = (
  fetch: FakeFetch,
  store: MemoryStore = signedIn(),
  options: TranscribeOptions = english,
) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(
        Effect.flip(
          Transcriber.use((transcriber) => transcriber.transcribe(new Uint8Array([1]), options)),
        ),
      ),
      Effect.provide(Transcriber.layer.pipe(Layer.provideMerge(testLayer(fetch, store)))),
    ),
  )

/** The text fields of the multipart request at `index`. */
const fieldsOf = async (fetch: FakeFetch, index = 0) => {
  const request = fetch.requests[index]
  assert.ok(request, `no request ${index}`)
  const form = await new Response(request.body, {
    headers: { "content-type": request.headers.get("content-type") ?? "" },
  }).formData()
  return Object.fromEntries(
    [...form.entries()].filter((entry): entry is [string, string] => P.isString(entry[1])),
  )
}

const sttResponse = () => json({ text: "  Hello there.  ", language: "en", duration: 1.5 })

describe("Transcriber.transcribe", () => {
  it("sends raw 16 kHz PCM to xAI speech-to-text with the signed-in user's token", async () => {
    const fetch = fakeFetch(sttResponse)
    const transcript = await transcribe(fetch, signedIn())
    assert.equal(transcript.text, "Hello there.")
    assert.equal(transcript.seconds, 1.5)
    const [request] = fetch.requests
    assert.equal(request?.url, "https://api.x.ai/v1/stt")
    assert.equal(request?.method, "POST")
    assert.equal(request?.headers.get("authorization"), "Bearer a1")
    assert.match(request?.body ?? "", /name="file"/)
    assert.deepEqual(await fieldsOf(fetch), {
      audio_format: "pcm",
      sample_rate: "16000",
      language: "en",
      format: "true",
    })
  })

  it("leaves out the language and formatting when xAI should detect the language", async () => {
    const fetch = fakeFetch(sttResponse)
    await transcribe(fetch, signedIn(), { language: Option.none(), formatNumbers: true })
    assert.deepEqual(await fieldsOf(fetch), {
      audio_format: "pcm",
      sample_rate: "16000",
    })
  })

  it("asks the user to sign in when nobody is signed in, without calling xAI", async () => {
    const fetch = fakeFetch(sttResponse)
    const error = await transcribeError(fetch, memoryStore())
    assert.equal(error.reason, "signIn")
    assert.equal(fetch.requests.length, 0)
  })

  it("asks the user to sign in again when xAI still refuses the token after a refresh", async () => {
    const fetch = fakeFetch((request) =>
      request.url.endsWith("/oauth2/token")
        ? json({ access_token: "a2", refresh_token: "r2", expires_in: 21600 })
        : json({ error: "unauthorized" }, 401),
    )
    const error = await transcribeError(fetch)
    assert.equal(error.reason, "signIn")
  })

  it("explains a 403 as the plan, and a 429 as the usage limit without retrying", async () => {
    const plan = await transcribeError(fakeFetch(() => json({ error: "forbidden" }, 403)))
    assert.equal(plan.reason, "plan")
    const limited = fakeFetch(() => json({ error: "rate limited" }, 429))
    const limit = await transcribeError(limited)
    assert.equal(limit.reason, "usageLimit")
    assert.equal(limited.requests.length, 1)
  })

  it("reports a network failure", async () => {
    const fetch: FakeFetch = {
      requests: [],
      fetch: () => Promise.reject(new TypeError("fetch failed")),
    }
    const error = await transcribeError(fetch)
    assert.equal(error.reason, "network")
  })

  it("starts the SDK in Tinycast, which reports Node 22.0.0, and puts the version back", async (t) => {
    // Node's own `process.versions` is read-only, so stand in Tinycast's plain object.
    const real = Object.getOwnPropertyDescriptor(process, "versions")
    assert.ok(real)
    const tinycast = { ...process.versions, node: "22.0.0", tinycast: "1" }
    Object.defineProperty(process, "versions", { ...real, value: tinycast })
    t.after(() => Object.defineProperty(process, "versions", real))
    const transcript = await transcribe(fakeFetch(sttResponse), signedIn())
    assert.equal(transcript.text, "Hello there.")
    assert.equal(tinycast.node, "22.0.0")
  })
})
