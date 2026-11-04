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
  ReferenceAudio,
  updateLabels,
  VoiceLabels,
  VoiceLibrary,
  wavOf,
} from "../src/lib/voices.ts"
import { fakeFetch, json, memoryStore, NOW, testLayer, type FakeFetch } from "./support.ts"

const decodeJson = Schema.decodeUnknownSync(Schema.fromJsonString(Schema.Unknown))

const signedIn = () =>
  memoryStore(
    new StoredTokens({
      accessToken: Redacted.make("a1"),
      refreshToken: Option.some(Redacted.make("r1")),
      idToken: Option.none(),
      expiresAt: NOW + 3_600_000,
    }),
  )

const runLibrary = <A, E>(
  fetch: FakeFetch,
  use: (library: VoiceLibrary["Service"]) => Effect.Effect<A, E>,
) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(VoiceLibrary.use(use)),
      Effect.provide(VoiceLibrary.layer.pipe(Layer.provideMerge(testLayer(fetch, signedIn())))),
    ),
  )

const customVoice = (id: string, name: string, created: string) => ({
  voice_id: id,
  name,
  description: "",
  gender: "female",
  accent: null,
  age: "young",
  language: "en",
  use_case: "narration",
  tone: null,
  created_at: created,
})

describe("VoiceLibrary.list", () => {
  it("lists custom voices newest first, across pages, then built-in voices by name", async () => {
    const fetch = fakeFetch((request) => {
      const url = new URL(request.url)
      if (url.pathname.endsWith("/tts/voices")) {
        return Response.json({
          voices: [
            { voice_id: "rex", name: "Rex", gender: "male" },
            { voice_id: "eve", name: "Eve", language: "en" },
          ],
        })
      }
      if (url.searchParams.get("pagination_token") === "p2") {
        return Response.json({
          voices: [customVoice("v_new", "Newer", "2026-10-02T00:00:00Z")],
        })
      }
      return Response.json({
        voices: [customVoice("v_old", "Older", "2026-10-01T00:00:00Z")],
        pagination_token: "p2",
      })
    })
    const voices = await runLibrary(fetch, (library) => library.list)
    assert.deepEqual(
      voices.map((voice) => [voice.id, voice.custom]),
      [
        ["v_new", true],
        ["v_old", true],
        ["eve", false],
        ["rex", false],
      ],
    )
    const newer = voices[0]
    assert.ok(newer)
    assert.deepEqual(newer.description, Option.none())
    assert.deepEqual(newer.accent, Option.none())
    assert.deepEqual(newer.useCase, Option.some("narration"))
    assert.deepEqual(newer.created, Option.some(1_790_899_200_000))
    assert.ok(
      fetch.requests.every((request) => request.headers.get("authorization") === "Bearer a1"),
    )
  })

  it("explains a 403 as the plan", async () => {
    const error = await runLibrary(
      fakeFetch(() => json({ error: "forbidden" }, 403)),
      (library) => Effect.flip(library.list),
    )
    assert.equal(error._tag, "VoicesError")
    assert.equal(error.reason, "plan")
  })
})

describe("VoiceLibrary.create", () => {
  it("uploads the clip with only the labels that are set", async () => {
    const fetch = fakeFetch(() => Response.json(customVoice("v_1", "Mine", "2026-10-26T00:00:00Z")))
    const labels = new VoiceLabels({
      ...VoiceLabels.empty,
      name: Option.some("Mine"),
      tone: Option.some("calm"),
    })
    const voice = await runLibrary(fetch, (library) =>
      library.create(
        new ReferenceAudio({ bytes: new Uint8Array([1, 2, 3]), filename: "clip.wav" }),
        labels,
      ),
    )
    assert.equal(voice.id, "v_1")
    const request = fetch.requests[0]
    assert.ok(request)
    assert.ok(request.url.endsWith("/custom-voices"))
    const form = await new Response(request.body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData()
    assert.equal(form.get("name"), "Mine")
    assert.equal(form.get("tone"), "calm")
    assert.equal(form.get("gender"), null)
    const file = form.get("file")
    assert.ok(file instanceof File)
    assert.equal(file.name, "clip.wav")
  })
})

describe("VoiceLibrary.update", () => {
  it("sends every label, with null to clear the empty ones", async () => {
    const fetch = fakeFetch(() =>
      Response.json(customVoice("v_1", "Renamed", "2026-10-26T00:00:00Z")),
    )
    const labels = new VoiceLabels({ ...VoiceLabels.empty, name: Option.some("Renamed") })
    await runLibrary(fetch, (library) => library.update("v_1", labels))
    const request = fetch.requests[0]
    assert.ok(request)
    assert.equal(request.method, "PATCH")
    assert.deepEqual(decodeJson(request.body), updateLabels(labels))
    assert.deepEqual(updateLabels(labels), {
      name: "Renamed",
      description: null,
      gender: null,
      accent: null,
      age: null,
      language: null,
      use_case: null,
      tone: null,
    })
  })
})

describe("wavOf", () => {
  it("puts a 44-byte mono 16 kHz 16-bit header in front of the samples", () => {
    const wav = wavOf(new Uint8Array([1, 0, 2, 0]))
    const view = new DataView(wav.buffer)
    assert.equal(wav.byteLength, 48)
    assert.equal(new TextDecoder().decode(wav.slice(0, 4)), "RIFF")
    assert.equal(new TextDecoder().decode(wav.slice(8, 12)), "WAVE")
    assert.equal(view.getUint16(22, true), 1)
    assert.equal(view.getUint32(24, true), 16_000)
    assert.equal(view.getUint16(34, true), 16)
    assert.equal(view.getUint32(40, true), 4)
    assert.deepEqual(Array.from(wav.slice(44)), [1, 0, 2, 0])
  })
})
