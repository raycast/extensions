import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Deferred from "effect/Deferred"
import * as Effect from "effect/Effect"
import * as Fiber from "effect/Fiber"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as TestClock from "effect/testing/TestClock"
import * as Stream from "effect/Stream"
import {
  clockOf,
  countWords,
  detailRows,
  dictateSpeech,
  DictationPreferences,
  DictationSettings,
  languageFromPreference,
  LIVE_FINISH_TIMEOUT,
  LIVE_TEXT_CHARS,
  recentText,
  recordSpeech,
  type DictationProgress,
} from "../src/lib/dictation.ts"
import { DictationHistory } from "../src/lib/history.ts"
import { joinChunks } from "../src/lib/recorder.ts"
import {
  LiveTranscriber,
  LiveTranscript,
  LiveTranscriptionError,
} from "../src/lib/live-transcriber.ts"
import { Transcriber, Transcript, type TranscribeOptions } from "../src/lib/transcriber.ts"
import { chunk, FakeRecorder, fakeRecorderLayer } from "./fake-recorder.ts"

const settings = (keepHistory: boolean) =>
  new DictationSettings({
    language: Option.some("en"),
    formatNumbers: true,
    afterDictation: "paste",
    keepHistory,
  })

/** A transcriber that answers `text` and records what it was asked. */
const fakeTranscriber = (text: string) => {
  const calls: Array<{ bytes: number; options: TranscribeOptions }> = []
  const layer = Layer.succeed(
    Transcriber,
    Transcriber.of({
      transcribe: (audio, options) =>
        Effect.sync(() => {
          calls.push({ bytes: audio.byteLength, options })
          return new Transcript({ text, seconds: 1, language: Option.some("en") })
        }),
    }),
  )
  return { calls, layer }
}

describe("joinChunks", () => {
  it("joins the chunks in order", () => {
    assert.deepEqual(
      joinChunks([new Uint8Array([1, 2]), new Uint8Array([]), new Uint8Array([3])]),
      new Uint8Array([1, 2, 3]),
    )
  })
})

describe("recentText", () => {
  it("keeps short text, and cuts long text to its end at a word", () => {
    assert.equal(recentText("Hello there."), "Hello there.")
    const long = Array.from({ length: 100 }, (_, index) => `word${index}`).join(" ")
    const shown = recentText(long)
    assert.ok(shown.startsWith("…word"))
    assert.ok(shown.endsWith("word99"))
    assert.ok(shown.length <= LIVE_TEXT_CHARS + 1)
  })
})

describe("countWords", () => {
  it("counts words, also in languages without spaces", () => {
    assert.equal(countWords("Hello there, how are you?"), 5)
    assert.equal(countWords(""), 0)
    assert.ok(countWords("今日はいい天気です") > 1)
  })
})

describe("detailRows", () => {
  it("shows words, length, speed, language, wait, and method", () => {
    const rows = detailRows({
      text: "one two three four five six",
      seconds: 3,
      language: Option.some("en"),
      readySeconds: Option.some(0.42),
      live: Option.some(true),
    })
    assert.deepEqual(
      rows.map((row) => [row.title, row.text]),
      [
        ["Words", "6"],
        ["Length", "0:03"],
        ["Speed", "120 words/min"],
        ["Language", "English"],
        ["Ready In", "0.4 s"],
        ["Transcribed", "Live"],
      ],
    )
  })

  it("leaves out what an older entry does not have, and speed under a second", () => {
    const rows = detailRows({
      text: "hi",
      seconds: 0.5,
      language: Option.none(),
      readySeconds: Option.none(),
      live: Option.none(),
    })
    assert.deepEqual(
      rows.map((row) => row.title),
      ["Words", "Length"],
    )
  })
})

describe("clockOf", () => {
  it("shows whole minutes and seconds", () => {
    assert.equal(clockOf(7.9), "0:07")
    assert.equal(clockOf(135), "2:15")
  })
})

describe("languageFromPreference", () => {
  it("treats auto and an empty value as detect automatically", () => {
    assert.deepEqual(languageFromPreference("en"), Option.some("en"))
    assert.deepEqual(languageFromPreference("auto"), Option.none())
    assert.deepEqual(languageFromPreference(" "), Option.none())
  })
})

describe("recordSpeech", () => {
  it("records until told to stop and returns the audio with its length", async () => {
    const recorder = new FakeRecorder().speak(chunk(1, 2), chunk(3, 4))
    const levels: Array<number> = []
    const recording = await Effect.runPromise(
      Effect.gen(function* () {
        const stop = yield* Deferred.make<void>()
        const heard = yield* Deferred.make<void>()
        const fiber = yield* Effect.forkChild(
          recordSpeech(Deferred.await(stop), (seconds) => {
            levels.push(seconds)
            if (levels.length === 2) Deferred.doneUnsafe(heard, Effect.void)
          }),
        )
        yield* Deferred.await(heard)
        yield* Deferred.succeed(stop, undefined)
        return yield* Fiber.join(fiber)
      }).pipe(
        Effect.provide(fakeRecorderLayer(recorder).pipe(Layer.provideMerge(TestClock.layer()))),
      ),
    )
    assert.deepEqual(recording.audio, chunk(1, 2, 3, 4))
    assert.equal(recording.seconds, 8 / 32_000)
    assert.deepEqual(levels, [4 / 32_000, 8 / 32_000])
    assert.equal(recorder.finished, true)
  })

  it("stops on its own after five minutes", async () => {
    const recorder = new FakeRecorder().speak(chunk(1))
    const recording = await Effect.runPromise(
      Effect.gen(function* () {
        const heard = yield* Deferred.make<void>()
        const fiber = yield* Effect.forkChild(
          recordSpeech(Effect.never, () => Deferred.doneUnsafe(heard, Effect.void)),
        )
        yield* Deferred.await(heard)
        yield* TestClock.adjust("5 minutes")
        return yield* Fiber.join(fiber)
      }).pipe(
        Effect.provide(fakeRecorderLayer(recorder).pipe(Layer.provideMerge(TestClock.layer()))),
      ),
    )
    assert.deepEqual(recording.audio, chunk(1))
    assert.equal(recorder.finished, true)
  })
})

type LiveBehavior =
  | { readonly kind: "says"; readonly text: string }
  | { readonly kind: "fails" }
  | { readonly kind: "hangs" }

/** A live transcriber that reads all the audio, then behaves as `behavior` says. */
const fakeLive = (behavior: LiveBehavior) => {
  const heard = { bytes: 0 }
  const layer = Layer.succeed(
    LiveTranscriber,
    LiveTranscriber.of({
      transcribe: (audio, _language, onText) =>
        audio.pipe(
          Stream.runForEach((piece) =>
            Effect.sync(() => {
              heard.bytes += piece.byteLength
            }),
          ),
          Effect.andThen(
            Match.value(behavior).pipe(
              Match.when({ kind: "says" }, ({ text }) =>
                Effect.sync(() => {
                  onText(text)
                  return new LiveTranscript({ text, language: Option.some("fr") })
                }),
              ),
              Match.when({ kind: "fails" }, () =>
                Effect.fail(new LiveTranscriptionError({ message: "dropped" })),
              ),
              Match.orElse(() => Effect.never),
            ),
          ),
        ),
    }),
  )
  return { heard, layer }
}

describe("dictateSpeech", () => {
  const run = (options: {
    readonly live: LiveBehavior
    readonly batch?: string
    readonly keepHistory?: boolean
    readonly speech?: ReadonlyArray<Uint8Array>
  }) => {
    const recorder = new FakeRecorder().speak(...(options.speech ?? [new Uint8Array(32_000)]))
    const live = fakeLive(options.live)
    const batch = fakeTranscriber(options.batch ?? "From the recording.")
    const events: Array<string> = []
    const progress: DictationProgress = {
      audio: () => {},
      text: (text) => events.push(`text:${text}`),
      liveStopped: () => events.push("liveStopped"),
      finishing: (seconds) => events.push(`finishing:${seconds}`),
    }
    const layer = Layer.mergeAll(
      live.layer,
      batch.layer,
      Layer.succeed(DictationPreferences, settings(options.keepHistory ?? true)),
      DictationHistory.layer.pipe(Layer.provideMerge(KeyValueStore.layerMemory)),
      fakeRecorderLayer(recorder),
    ).pipe(Layer.provideMerge(TestClock.layer()))
    const result = Effect.runPromise(
      Effect.gen(function* () {
        const stop = yield* Deferred.make<void>()
        const heard = yield* Deferred.make<void>()
        const fiber = yield* Effect.forkChild(
          dictateSpeech(Deferred.await(stop), {
            ...progress,
            audio: () => Deferred.doneUnsafe(heard, Effect.void),
          }),
        )
        yield* Deferred.await(heard)
        yield* Deferred.succeed(stop, undefined)
        if (options.live.kind === "hangs") {
          yield* Effect.yieldNow
          yield* TestClock.adjust(LIVE_FINISH_TIMEOUT)
        }
        const transcript = yield* Fiber.join(fiber)
        const entries = yield* DictationHistory.use((history) => history.list)
        return { transcript, entries }
      }).pipe(Effect.provide(layer)),
    )
    return { batch: batch.calls, live: live.heard, events, result }
  }

  it("uses the live text, keeps it in the history, and does not send the recording again", async () => {
    const { batch, live, events, result } = run({ live: { kind: "says", text: "Live words." } })
    const { transcript, entries } = await result
    assert.deepEqual(
      Option.map(transcript, (found) => [found.text, found.language, found.live, found.seconds]),
      Option.some(["Live words.", Option.some("fr"), true, 1]),
    )
    assert.equal(live.bytes, 32_000)
    assert.deepEqual(batch, [])
    assert.deepEqual(events, ["text:Live words.", "finishing:1"])
    assert.deepEqual(
      entries.map((entry) => [entry.text, entry.seconds, entry.language, entry.live]),
      [["Live words.", 1, Option.some("fr"), Option.some(true)]],
    )
  })

  it("sends the whole recording when live text stops", async () => {
    const { batch, events, result } = run({ live: { kind: "fails" } })
    const { transcript } = await result
    assert.deepEqual(
      Option.map(transcript, (found) => [found.text, found.language, found.live]),
      Option.some(["From the recording.", Option.some("en"), false]),
    )
    assert.deepEqual(batch, [
      { bytes: 32_000, options: { language: Option.some("en"), formatNumbers: true } },
    ])
    assert.ok(events.includes("liveStopped"))
  })

  it("sends the whole recording when live text gives nothing", async () => {
    const { batch, result } = run({ live: { kind: "says", text: "" } })
    await result
    assert.equal(batch.length, 1)
  })

  it("sends the whole recording when live text does not finish in time", async () => {
    const { batch, result } = run({ live: { kind: "hangs" } })
    const { transcript } = await result
    assert.deepEqual(
      Option.map(transcript, (found) => found.text),
      Option.some("From the recording."),
    )
    assert.equal(batch.length, 1)
  })

  it("reports no speech for a very short recording, without calling xAI", async () => {
    const { batch, result } = run({
      live: { kind: "says", text: "ignored" },
      speech: [new Uint8Array(64)],
    })
    const { transcript, entries } = await result
    assert.deepEqual(transcript, Option.none())
    assert.deepEqual(batch, [])
    assert.deepEqual(entries, [])
  })

  it("keeps nothing when the history is off or nothing was said", async () => {
    const off = run({ live: { kind: "says", text: "Hello." }, keepHistory: false })
    assert.deepEqual((await off.result).entries, [])
    const silent = run({ live: { kind: "says", text: "" }, batch: "" })
    const { transcript, entries } = await silent.result
    assert.deepEqual(transcript, Option.none())
    assert.deepEqual(entries, [])
  })
})
