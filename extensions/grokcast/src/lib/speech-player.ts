// Plays speech in the background, so it keeps going after the command ends, and
// stops it on the next run. The player's process ID is kept in a key-value store
// (Raycast's LocalStorage in the extension). No Raycast imports.

import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as KeyValueStore from "effect/persistence/KeyValueStore"

const KEY = "read-aloud-player"

/** The audio could not be played. */
export class PlaybackError extends Schema.TaggedError<PlaybackError>()("PlaybackError", {
  message: Schema.String,
}) {}

/** The player that is playing now. */
export class PlayingSpeech extends Schema.Class<PlayingSpeech>("PlayingSpeech")({
  pid: Schema.Int,
}) {}

/**
 * Starts and stops the audio player process. The extension writes the audio to a
 * file and plays it with macOS `afplay`.
 */
export class AudioLauncher extends Context.Service<
  AudioLauncher,
  {
    /** Start playing MP3 audio in a process that outlives the command. Gives its process ID. */
    readonly play: (audio: Uint8Array) => Effect.Effect<number, PlaybackError>
    /** True when `pid` is still a player this extension started. */
    readonly isPlaying: (pid: number) => Effect.Effect<boolean>
    readonly stop: (pid: number) => Effect.Effect<void>
  }
>()("grokcast/AudioLauncher") {}

const makePlayer = Effect.fn("SpeechPlayer.make")(function* () {
  const launcher = yield* AudioLauncher
  const store = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, PlayingSpeech)

  /** A missing or unreadable record counts as nothing playing. */
  const playing = store.get(KEY).pipe(
    Effect.catch(() => Effect.succeedNone),
    Effect.flatMap((record) =>
      Option.match(record, {
        onNone: () => Effect.succeedNone,
        onSome: (current) =>
          launcher
            .isPlaying(current.pid)
            .pipe(Effect.map((alive) => Option.filter(record, () => alive))),
      }),
    ),
  )

  const forget = store.remove(KEY).pipe(Effect.ignore)

  /** Stop the speech that is playing. False when nothing was playing. */
  const stop = Effect.gen(function* () {
    const current = yield* playing
    yield* forget
    return yield* Option.match(current, {
      onNone: () => Effect.succeed(false),
      onSome: (speech) => launcher.stop(speech.pid).pipe(Effect.as(true)),
    })
  }).pipe(Effect.withSpan("SpeechPlayer.stop"))

  /** Play MP3 audio in the background, after stopping any speech that is playing. */
  const play = Effect.fn("SpeechPlayer.play")(function* (audio: Uint8Array) {
    yield* stop
    const pid = yield* launcher.play(audio)
    // Without the record, the next run cannot stop this speech, but it still plays.
    yield* store.set(KEY, new PlayingSpeech({ pid })).pipe(Effect.ignore)
  })

  return SpeechPlayer.of({ isPlaying: Effect.map(playing, Option.isSome), play, stop })
})

export class SpeechPlayer extends Context.Service<
  SpeechPlayer,
  {
    readonly isPlaying: Effect.Effect<boolean>
    readonly play: (audio: Uint8Array) => Effect.Effect<void, PlaybackError>
    readonly stop: Effect.Effect<boolean>
  }
>()("grokcast/SpeechPlayer") {
  static readonly layer = Layer.effect(SpeechPlayer, makePlayer())
}
