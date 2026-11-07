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

/** A call to the player: its value, or an error of type `E`. */
type PlayerCall<A, E = never> = ReturnType<typeof Effect.fromResult<A, E>>

/**
 * Starts and stops the audio player process. The extension writes the audio to a
 * file and plays it with macOS `afplay`.
 */
export class AudioLauncher extends Context.Service<
  AudioLauncher,
  {
    /** Start playing MP3 audio in a process that outlives the command. Gives its process ID. */
    readonly play: (audio: Uint8Array) => PlayerCall<number, PlaybackError>
    /** True when `pid` is still a player this extension started. */
    readonly isPlaying: (pid: number) => PlayerCall<boolean>
    readonly stop: (pid: number) => PlayerCall<void>
  }
>()("grokcast/AudioLauncher") {}

const makePlayer = Effect.fn("SpeechPlayer.make")(function* () {
  const launcher = yield* AudioLauncher
  const store = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, PlayingSpeech)

  /** The speech in `record`, while its player still runs. */
  const stillPlaying = (record: PlayingSpeech) =>
    launcher.isPlaying(record.pid).pipe(Effect.map((alive) => Option.liftPredicate(record, () => alive)))

  /** A missing or unreadable record counts as nothing playing. */
  const playing = store.get(KEY).pipe(
    Effect.catch(() => Effect.succeedNone),
    Effect.map(Option.map(stillPlaying)),
    Effect.flatMap(Effect.transposeOption),
    Effect.map(Option.flatten),
  )

  const forget = store.remove(KEY).pipe(Effect.ignore)

  /** Stop the speech that is playing. False when nothing was playing. */
  const stop = playing.pipe(
    Effect.tap(() => forget),
    Effect.map(Option.map((speech) => launcher.stop(speech.pid))),
    Effect.flatMap(Effect.transposeOption),
    Effect.map(Option.isSome),
    Effect.withSpan("SpeechPlayer.stop"),
  )

  /** Play MP3 audio in the background, after stopping any speech that is playing. */
  const play = Effect.fn("SpeechPlayer.play")(function* (audio: Uint8Array) {
    yield* stop
    const pid = yield* launcher.play(audio)
    // Without the record, the next run cannot stop this speech, but it still plays.
    yield* store.set(KEY, new PlayingSpeech({ pid })).pipe(Effect.ignore)
  })

  return { isPlaying: Effect.map(playing, Option.isSome), play, stop }
})

export class SpeechPlayer extends Context.Service<SpeechPlayer>()("grokcast/SpeechPlayer", {
  make: makePlayer(),
}) {
  static readonly layer = Layer.effect(SpeechPlayer, SpeechPlayer.make)
}
