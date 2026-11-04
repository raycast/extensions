import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Result from "effect/Result"
import * as Stream from "effect/Stream"
import * as TestClock from "effect/testing/TestClock"
import {
  addPartial,
  FRAME_BYTES,
  toFrames,
  LiveText,
  LiveTranscriber,
  LiveTranscript,
  liveSttUrl,
  textOf,
  type Partial,
} from "../src/lib/live-transcriber.ts"
import { StoredTokens } from "../src/lib/session.ts"
import { chunk } from "./fake-recorder.ts"
import { done, fakeLiveStt, partial, type Script } from "./fake-live-stt.ts"
import { fakeFetch, memoryStore, NOW, testLayer, type MemoryStore } from "./support.ts"

const signedIn = () =>
  memoryStore(
    new StoredTokens({
      accessToken: Redacted.make("a1"),
      refreshToken: Option.some(Redacted.make("r1")),
      idToken: Option.none(),
      expiresAt: NOW + 3_600_000,
    }),
  )

const speech = Stream.make(chunk(1, 2), chunk(3, 4))

/** Run a live transcription against a fake xAI that follows `script`. */
const transcribe = (
  script: Script,
  store: MemoryStore = signedIn(),
  audio: Stream.Stream<Uint8Array> = speech,
) => {
  const xai = fakeLiveStt(script)
  const updates: Array<string> = []
  const result = Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(
        LiveTranscriber.use((live) =>
          live.transcribe(audio, Option.some("en"), (text) => updates.push(text)),
        ),
      ),
      Effect.result,
      Effect.provide(
        LiveTranscriber.layer.pipe(
          Layer.provideMerge(xai.layer),
          Layer.provideMerge(
            testLayer(
              fakeFetch(() => new Response(null, { status: 500 })),
              store,
            ),
          ),
        ),
      ),
    ),
  )
  return { sockets: xai.sockets, updates, result }
}

/** Decoded partials, as `addPartial` gets them. */
const decoded = (event: ReturnType<typeof partial>): Partial => ({
  ...event,
  language: Option.some(event.language),
})

const apply = (...events: ReadonlyArray<ReturnType<typeof partial>>) =>
  events.map(decoded).reduce(addPartial, LiveText.empty)

describe("liveSttUrl", () => {
  it("asks for interim text from 16 kHz PCM", () => {
    const url = new URL(liveSttUrl(Option.some("en")))
    assert.equal(url.origin + url.pathname, "wss://api.x.ai/v1/stt")
    assert.deepEqual(Object.fromEntries(url.searchParams), {
      sample_rate: "16000",
      encoding: "pcm",
      interim_results: "true",
      endpointing: "400",
      language: "en",
    })
  })

  it("leaves out the language when xAI should detect it", () => {
    assert.equal(new URL(liveSttUrl(Option.none())).searchParams.has("language"), false)
  })
})

describe("toFrames", () => {
  it("regroups chunks into 100 ms frames in their own buffers, and drops a split last sample", async () => {
    const slab = new Uint8Array(FRAME_BYTES * 2 + 3).map((_, index) => index % 251)
    const frames = await Effect.runPromise(
      Stream.make(slab.subarray(0, 1001), slab.subarray(1001)).pipe(toFrames, Stream.runCollect),
    )
    assert.deepEqual(
      frames.map((frame) => [frame.byteLength, frame.buffer.byteLength]),
      [
        [FRAME_BYTES, FRAME_BYTES],
        [FRAME_BYTES, FRAME_BYTES],
        [2, 2],
      ],
    )
    assert.deepEqual(frames[1], slab.slice(FRAME_BYTES, FRAME_BYTES * 2))
    assert.deepEqual(frames[2], slab.slice(FRAME_BYTES * 2, FRAME_BYTES * 2 + 2))
  })
})

describe("addPartial", () => {
  it("keeps the last language xAI reported", () => {
    assert.deepEqual(
      apply(partial("Hola", false, false, "es"), partial("Hola amigo", true, false, "")).language,
      Option.some("es"),
    )
  })

  it("shows the piece in progress and replaces it as it changes", () => {
    assert.equal(textOf(apply(partial("Hello"), partial("Hello there"))), "Hello there")
  })

  it("keeps final pieces, then uses the utterance final, which restates them", () => {
    const live = apply(
      partial("Hello there.", true),
      partial("How are"),
      partial("How are you?", true),
    )
    assert.equal(textOf(live), "Hello there. How are you?")
    const finished = addPartial(live, decoded(partial("Hello there. How are you?", true, true)))
    assert.deepEqual(finished.utterances, ["Hello there. How are you?"])
    assert.equal(textOf(finished), "Hello there. How are you?")
  })

  it("joins utterances, and uses the final pieces when an utterance final is empty", () => {
    const live = apply(
      partial("First one.", true, true),
      partial("Second", true),
      partial("", true, true),
      partial("Third"),
    )
    assert.equal(textOf(live), "First one. Second Third")
  })
})

describe("LiveTranscriber.transcribe", () => {
  it("streams audio with the user's token after xAI starts the session, and returns the text", async () => {
    const { sockets, updates, result } = transcribe({
      onAudio: [partial("Hello")],
      onAudioDone: [partial("Hello there.", true), partial("Hello there.", true, true), done],
      dropAfterDone: true,
    })
    assert.deepEqual(
      await result,
      Result.succeed(new LiveTranscript({ text: "Hello there.", language: Option.some("en") })),
    )
    const [socket] = sockets
    assert.ok(socket)
    assert.match(socket.url, /^wss:\/\/api\.x\.ai\/v1\/stt\?/)
    assert.equal(socket.headers["authorization"], "Bearer a1")
    assert.deepEqual(socket.audio, [{ bytes: 8, afterCreated: true }])
    assert.deepEqual(socket.texts, ['{"type":"audio.done"}'])
    assert.deepEqual(updates.slice(-1), ["Hello there."])
    assert.ok(updates.includes("Hello"))
  })

  it("keeps the text when xAI drops the connection after all audio was sent", async () => {
    const { result } = transcribe({
      onAudioDone: [partial("Short.", true)],
      dropAfterDone: true,
    })
    assert.deepEqual(
      Result.map(await result, (heard) => heard.text),
      Result.succeed("Short."),
    )
  })

  it("fails when the connection drops while audio is still being sent", async () => {
    const { result } = transcribe(
      { onAudio: [partial("Hel")], dropAfterFrames: 1 },
      signedIn(),
      Stream.concat(Stream.make(new Uint8Array(FRAME_BYTES)), Stream.never),
    )
    assert.ok(Result.isFailure(await result))
  })

  it("fails when xAI reports an error", async () => {
    const { result } = transcribe({
      onAudioDone: [{ type: "error", message: "bad audio" }],
    })
    assert.deepEqual(
      Result.getFailure(await result).pipe(Option.map((error) => error.message)),
      Option.some("bad audio"),
    )
  })

  it("fails when the connection is refused", async () => {
    const { result } = transcribe({ refuse: true })
    assert.ok(Result.isFailure(await result))
  })

  it("fails without connecting when nobody is signed in", async () => {
    const { sockets, result } = transcribe({}, memoryStore())
    assert.ok(Result.isFailure(await result))
    assert.equal(sockets.length, 0)
  })
})
