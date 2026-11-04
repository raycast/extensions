import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { StoredTokens } from "../src/lib/session.ts"
import {
  MAX_SPEECH_CHARACTERS,
  optionalPreference,
  Speaker,
  SpeechSettings,
  speedFromPreference,
} from "../src/lib/speech.ts"
import { fakeFetch, json, memoryStore, NOW, testLayer, type FakeFetch } from "./support.ts"

const signedIn = () =>
  memoryStore(
    new StoredTokens({
      accessToken: Redacted.make("a1"),
      refreshToken: Option.some(Redacted.make("r1")),
      idToken: Option.none(),
      expiresAt: NOW + 3_600_000,
    }),
  )

const xaiDefaults = new SpeechSettings({
  voice: Option.none(),
  speed: Option.none(),
  language: "auto",
})

const speakEffect = (fetch: FakeFetch, text: string, settings: SpeechSettings) =>
  TestClock.setTime(NOW).pipe(
    Effect.andThen(Speaker.use((speaker) => speaker.speak(text, settings))),
    Effect.provide(Speaker.layer.pipe(Layer.provideMerge(testLayer(fetch, signedIn())))),
  )

const speak = (fetch: FakeFetch, text = "Hello there.", settings = xaiDefaults) =>
  Effect.runPromise(speakEffect(fetch, text, settings))

const speakError = (fetch: FakeFetch, text = "Hello there.") =>
  Effect.runPromise(Effect.flip(speakEffect(fetch, text, xaiDefaults)))

const mp3 = () =>
  new Response(new Uint8Array([0x49, 0x44, 0x33, 1]), { headers: { "content-type": "audio/mpeg" } })

const RequestBody = Schema.fromJsonString(
  Schema.Record(
    Schema.String,
    Schema.Union([Schema.String, Schema.Number, Schema.Struct({ codec: Schema.String })]),
  ),
)

const bodyOf = (fetch: FakeFetch) => Schema.decodeUnknownSync(RequestBody)(fetch.requests[0]?.body)

describe("Speaker.speak", () => {
  it("asks xAI text-to-speech for MP3 with the signed-in user's token", async () => {
    const fetch = fakeFetch(mp3)
    const speech = await speak(fetch, "  Hello there.  ")
    assert.deepEqual([...speech.audio], [0x49, 0x44, 0x33, 1])
    assert.equal(speech.characters, 12)
    const [request] = fetch.requests
    assert.equal(request?.url, "https://api.x.ai/v1/tts")
    assert.equal(request?.method, "POST")
    assert.equal(request?.headers.get("authorization"), "Bearer a1")
    assert.deepEqual(bodyOf(fetch), {
      text: "Hello there.",
      language: "auto",
      output_format: { codec: "mp3" },
    })
  })

  it("sends the voice, speed, and language the user picked", async () => {
    const fetch = fakeFetch(mp3)
    await speak(
      fetch,
      "Hola.",
      new SpeechSettings({
        voice: Option.some("rex"),
        speed: Option.some(1.25),
        language: "es-MX",
      }),
    )
    assert.deepEqual(bodyOf(fetch), {
      text: "Hola.",
      language: "es-MX",
      output_format: { codec: "mp3" },
      voice_id: "rex",
      speed: 1.25,
    })
  })

  it("refuses empty and too-long text without calling xAI", async () => {
    const fetch = fakeFetch(mp3)
    assert.equal((await speakError(fetch, "   ")).reason, "noText")
    assert.equal((await speakError(fetch, "a".repeat(MAX_SPEECH_CHARACTERS + 1))).reason, "tooLong")
    assert.equal(fetch.requests.length, 0)
  })

  it("explains a 403 as the plan, and a 429 as the usage limit without retrying", async () => {
    const plan = await speakError(fakeFetch(() => json({ error: "forbidden" }, 403)))
    assert.equal(plan.reason, "plan")
    assert.match(plan.message, /text-to-speech/)
    const limited = fakeFetch(() => json({ error: "rate limited" }, 429))
    assert.equal((await speakError(limited)).reason, "usageLimit")
    assert.equal(limited.requests.length, 1)
  })

  it("asks the user to sign in when nobody is signed in", async () => {
    const fetch = fakeFetch(mp3)
    const error = await Effect.runPromise(
      Effect.flip(
        TestClock.setTime(NOW).pipe(
          Effect.andThen(Speaker.use((speaker) => speaker.speak("Hi.", xaiDefaults))),
          Effect.provide(Speaker.layer.pipe(Layer.provideMerge(testLayer(fetch, memoryStore())))),
        ),
      ),
    )
    assert.equal(error.reason, "signIn")
    assert.equal(fetch.requests.length, 0)
  })
})

describe("Read Aloud preferences", () => {
  it("treat xAI Default and empty values as no choice", () => {
    assert.deepEqual(optionalPreference("default"), Option.none())
    assert.deepEqual(optionalPreference(" "), Option.none())
    assert.deepEqual(optionalPreference("eve"), Option.some("eve"))
  })

  it("keep only speeds xAI accepts", () => {
    assert.deepEqual(speedFromPreference("default"), Option.none())
    assert.deepEqual(speedFromPreference("1.25"), Option.some(1.25))
    assert.deepEqual(speedFromPreference("2"), Option.none())
    assert.deepEqual(speedFromPreference("fast"), Option.none())
  })
})
