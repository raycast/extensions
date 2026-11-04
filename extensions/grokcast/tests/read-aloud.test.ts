import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { firstText, readAloud } from "../src/lib/read-aloud.ts"
import { AudioLauncher, PlaybackError, SpeechPlayer } from "../src/lib/speech-player.ts"
import { GrokVoice, ReadAloudVoice } from "../src/lib/voices.ts"
import {
  Speaker,
  Speech,
  SpeechError,
  SpeechPreferences,
  SpeechSettings,
} from "../src/lib/speech.ts"

interface FakeAudio {
  /** Process IDs that are playing now. */
  readonly playing: Set<number>
  readonly played: Array<Uint8Array>
  readonly spoken: Array<string>
  readonly voices: Array<Option.Option<string>>
  nextPid: number
  failPlay: boolean
}

const fakeAudio = (): FakeAudio => ({
  playing: new Set(),
  played: [],
  spoken: [],
  voices: [],
  nextPid: 100,
  failPlay: false,
})

const layer = (audio: FakeAudio) =>
  Layer.mergeAll(
    SpeechPlayer.layer.pipe(
      Layer.provide(
        Layer.succeed(
          AudioLauncher,
          AudioLauncher.of({
            play: (bytes) =>
              audio.failPlay
                ? Effect.fail(new PlaybackError({ message: "no player" }))
                : Effect.sync(() => {
                    audio.played.push(bytes)
                    const pid = audio.nextPid++
                    audio.playing.add(pid)
                    return pid
                  }),
            isPlaying: (pid) => Effect.sync(() => audio.playing.has(pid)),
            stop: (pid) =>
              Effect.sync(() => {
                audio.playing.delete(pid)
              }),
          }),
        ),
      ),
    ),
    Layer.succeed(
      Speaker,
      Speaker.of({
        speak: (text, settings) =>
          Effect.sync(() => {
            audio.spoken.push(text)
            audio.voices.push(settings.voice)
            return new Speech({ audio: new Uint8Array([1, 2]), characters: text.length })
          }),
      }),
    ),
    Layer.succeed(
      SpeechPreferences,
      new SpeechSettings({ voice: Option.some("eve"), speed: Option.none(), language: "auto" }),
    ),
    ReadAloudVoice.layer,
  ).pipe(Layer.provideMerge(KeyValueStore.layerMemory))

const text = (value: string) => Effect.succeed(Option.some(value))

describe("firstText", () => {
  it("takes the first source with text and does not read the rest", async () => {
    let clipboardRead = false
    const clipboard = Effect.sync(() => {
      clipboardRead = true
      return Option.some("clipboard")
    })
    const found = await Effect.runPromise(firstText([text("  "), text("selection"), clipboard]))
    assert.deepEqual(found, Option.some("selection"))
    assert.equal(clipboardRead, false)
  })

  it("finds nothing when every source is empty", async () => {
    const found = await Effect.runPromise(firstText([text(""), Effect.succeedNone]))
    assert.deepEqual(found, Option.none())
  })
})

describe("readAloud", () => {
  it("reads the text, then stops on the next run without asking xAI again", async () => {
    const audio = fakeAudio()
    const results = await Effect.runPromise(
      Effect.all([
        readAloud(text("Hello."), Effect.void),
        readAloud(text("Hello again."), Effect.void),
      ]).pipe(Effect.provide(layer(audio))),
    )
    assert.deepEqual(
      results.map((result) => result._tag),
      ["Reading", "Stopped"],
    )
    assert.deepEqual(audio.spoken, ["Hello."])
    assert.equal(audio.playing.size, 0)
  })

  it("reads again once the earlier speech has finished on its own", async () => {
    const audio = fakeAudio()
    const results = await Effect.runPromise(
      Effect.gen(function* () {
        const first = yield* readAloud(text("One."), Effect.void)
        audio.playing.clear()
        const second = yield* readAloud(text("Two."), Effect.void)
        return [first._tag, second._tag]
      }).pipe(Effect.provide(layer(audio))),
    )
    assert.deepEqual(results, ["Reading", "Reading"])
    assert.deepEqual(audio.spoken, ["One.", "Two."])
  })

  it("fails with noText when there is nothing to read", async () => {
    const error = await Effect.runPromise(
      Effect.flip(readAloud(Effect.succeedNone, Effect.void)).pipe(
        Effect.provide(layer(fakeAudio())),
      ),
    )
    assert.ok(error instanceof SpeechError)
    assert.equal(error.reason, "noText")
  })

  it("reports a player that would not start", async () => {
    const audio = fakeAudio()
    audio.failPlay = true
    const error = await Effect.runPromise(
      Effect.flip(readAloud(text("Hi."), Effect.void)).pipe(Effect.provide(layer(audio))),
    )
    assert.ok(error instanceof PlaybackError)
  })

  it("uses the voice picked in Grok Voices instead of the Voice preference", async () => {
    const audio = fakeAudio()
    const custom = new GrokVoice({
      id: "v_123",
      name: "My Voice",
      custom: true,
      gender: Option.none(),
      language: Option.none(),
      description: Option.none(),
      accent: Option.none(),
      age: Option.none(),
      useCase: Option.none(),
      tone: Option.none(),
      created: Option.none(),
    })
    const finishPlaying = Effect.sync(() => audio.playing.clear())
    await Effect.runPromise(
      ReadAloudVoice.use((voice) => voice.set(custom)).pipe(
        Effect.andThen(readAloud(text("One."), Effect.void)),
        Effect.andThen(finishPlaying),
        Effect.andThen(ReadAloudVoice.use((voice) => voice.clear)),
        Effect.andThen(readAloud(text("Two."), Effect.void)),
        Effect.provide(layer(audio)),
      ),
    )
    assert.deepEqual(audio.voices, [Option.some("v_123"), Option.some("eve")])
  })
})
