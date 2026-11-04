// The microphone: runs the Swift recorder in `recorder/` and streams its audio.
// No Raycast imports, so tests run it under plain Node with a fake process.

import * as Cause from "effect/Cause"
import * as Context from "effect/Context"
import * as Data from "effect/Data"
import * as Deferred from "effect/Deferred"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Queue from "effect/Queue"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"

/** xAI speech-to-text takes 16 kHz mono PCM. */
export const SAMPLE_RATE = 16_000

/** The recorder writes mono, signed 16-bit little-endian samples. */
export const BYTES_PER_SAMPLE = 2

/** How long to wait for the recorder to exit after it is told to stop. */
const STOP_GRACE = Duration.seconds(2)

/** The recorder stops by itself after this long, in case nothing stops it. */
export const MAX_RECORDING = Duration.minutes(10)

export const MicrophoneAccess = Schema.Literals([
  "authorized",
  "denied",
  "restricted",
  "notDetermined",
])
export type MicrophoneAccess = typeof MicrophoneAccess.Type

/** The microphone could not be used. `reason` says why, `message` is for the user. */
export class RecorderError extends Schema.TaggedError<RecorderError>()("RecorderError", {
  reason: Schema.Literals(["denied", "failed"]),
  message: Schema.String,
}) {}

const deniedMessage =
  "Grokcast cannot use the microphone. Open System Settings > Privacy & Security > Microphone and turn on Raycast (or Tinycast)."

/** The macOS microphone permission, read and requested through the Swift helper. */
export class MicrophonePermission extends Context.Service<
  MicrophonePermission,
  {
    readonly status: Effect.Effect<MicrophoneAccess, RecorderError>
    /** Shows the macOS prompt. Succeeds with `true` when the user allows it. */
    readonly request: Effect.Effect<boolean, RecorderError>
  }
>()("grokcast/MicrophonePermission") {}

/** How the recorder process ended. */
export type RecorderExit = Data.TaggedEnum<{
  Finished: {}
  Failed: { readonly message: string }
}>
export const RecorderExit = Data.taggedEnum<RecorderExit>()

/** The exit for a recorder exit code (none when a signal ended it) and what it printed to stderr. */
export const exitFromCode = (code: Option.Option<number>, stderr: string): RecorderExit =>
  Match.value(Option.getOrElse(code, () => -1)).pipe(
    Match.when(0, () => RecorderExit.Finished()),
    Match.orElse(() =>
      RecorderExit.Failed({
        message: stderr.trim() === "" ? "The microphone recorder stopped." : stderr.trim(),
      }),
    ),
  )

/** What a running recorder reports. */
export interface RecorderEvents {
  readonly audio: (chunk: Uint8Array) => void
  readonly exit: (exit: RecorderExit) => void
}

/** A running recorder process. */
export interface RecorderProcess {
  /** Send SIGTERM. The recorder stops and exits. */
  readonly finish: () => void
  /** End the recorder at once. */
  readonly kill: () => void
}

/**
 * Starts the compiled recorder binary and reports its audio and exit through `events`.
 * Raycast runs it from `environment.assetsPath`.
 */
export class RecorderLauncher extends Context.Service<
  RecorderLauncher,
  {
    readonly start: (args: ReadonlyArray<string>, events: RecorderEvents) => RecorderProcess
  }
>()("grokcast/RecorderLauncher") {}

const failed = (message: string) => new RecorderError({ reason: "failed", message })

const makeRecorder = Effect.fn("Recorder.make")(function* () {
  const permission = yield* MicrophonePermission
  const launcher = yield* RecorderLauncher

  /** Ask for access the first time; fail with a clear message when it was turned off. */
  const ensureAccess = Effect.gen(function* () {
    const status = yield* permission.status
    const allowed = yield* Match.value(status).pipe(
      Match.when("authorized", () => Effect.succeed(true)),
      Match.when("notDetermined", () => permission.request),
      Match.orElse(() => Effect.succeed(false)),
    )
    if (!allowed) return yield* new RecorderError({ reason: "denied", message: deniedMessage })
  }).pipe(Effect.withSpan("Recorder.ensureAccess"))

  const audio = Stream.callback<Uint8Array, RecorderError>((queue) => {
    const exited = Deferred.makeUnsafe<void>()
    const samples = sampleAligner()
    const events: RecorderEvents = {
      audio: (chunk) => {
        const aligned = samples(chunk)
        if (aligned.byteLength > 0) Queue.offerUnsafe(queue, aligned)
      },
      exit: (exit) => {
        Deferred.doneUnsafe(exited, Effect.void)
        RecorderExit.$match(exit, {
          Finished: () => Queue.endUnsafe(queue),
          Failed: ({ message }) => Queue.failCauseUnsafe(queue, Cause.fail(failed(message))),
        })
      },
    }
    /** Tell the recorder to stop and exit; kill it when it does not. */
    const stop = (recorder: RecorderProcess) =>
      Effect.sync(recorder.finish).pipe(
        Effect.andThen(Deferred.await(exited)),
        Effect.timeoutOrElse({ duration: STOP_GRACE, orElse: () => Effect.sync(recorder.kill) }),
      )
    return Effect.acquireRelease(
      Effect.try({
        try: () =>
          launcher.start(
            ["record", String(SAMPLE_RATE), String(Duration.toSeconds(MAX_RECORDING))],
            events,
          ),
        catch: () => failed("Could not start the microphone recorder."),
      }),
      stop,
    )
  })

  /**
   * Mono 16 kHz signed 16-bit little-endian PCM from the default microphone. The
   * recorder runs while the stream is consumed and stops when it ends or is interrupted.
   */
  const record = Stream.unwrap(ensureAccess.pipe(Effect.as(audio)))

  return Recorder.of({ ensureAccess, record })
})

export class Recorder extends Context.Service<
  Recorder,
  {
    readonly ensureAccess: Effect.Effect<void, RecorderError>
    readonly record: Stream.Stream<Uint8Array, RecorderError>
  }
>()("grokcast/Recorder") {
  static readonly layer = Layer.effect(Recorder, makeRecorder())
}

/**
 * Returns a function that turns chunks of a byte stream into chunks of whole
 * samples. A byte left over from a chunk goes in front of the next one. Tinycast
 * splits process output at odd byte counts (it holds back what looks like part of a
 * UTF-8 character), and a split sample shifts every later sample by one byte.
 */
export const sampleAligner = () => {
  const carry = { bytes: new Uint8Array(0) }
  return (chunk: Uint8Array): Uint8Array => {
    const joined = carry.bytes.byteLength === 0 ? chunk : joinChunks([carry.bytes, chunk])
    const whole = joined.byteLength - (joined.byteLength % BYTES_PER_SAMPLE)
    carry.bytes = joined.slice(whole)
    return joined.subarray(0, whole)
  }
}

/**
 * The loudness of a PCM chunk in dBFS (0 is full scale), from its RMS. Silence and an
 * empty chunk give `-Infinity`.
 */
export const levelDbfs = (chunk: Uint8Array): number => {
  const samples = Math.floor(chunk.byteLength / BYTES_PER_SAMPLE)
  if (samples === 0) return Number.NEGATIVE_INFINITY
  const view = new DataView(chunk.buffer, chunk.byteOffset, samples * BYTES_PER_SAMPLE)
  const sumOfSquares = Array.from({ length: samples }, (_, index) =>
    view.getInt16(index * BYTES_PER_SAMPLE, true),
  ).reduce((sum, sample) => sum + (sample / 32768) ** 2, 0)
  return 10 * Math.log10(sumOfSquares / samples)
}

/** Seconds of audio in `bytes` of recorder output. */
export const durationOfBytes = (bytes: number): number => bytes / (SAMPLE_RATE * BYTES_PER_SAMPLE)

/** A text meter with `steps` steps (20 by default) for a level between -60 dBFS and 0 dBFS. */
export const levelBar = (level: number, steps = 20): string => {
  const filled = Math.round(Math.min(1, Math.max(0, (level + 60) / 60)) * steps)
  return "█".repeat(filled) + "░".repeat(steps - filled)
}

/** One buffer with the bytes of all `chunks`, in order. */
export const joinChunks = (chunks: ReadonlyArray<Uint8Array>): Uint8Array<ArrayBuffer> => {
  const joined = new Uint8Array(chunks.reduce((total, chunk) => total + chunk.byteLength, 0))
  chunks.reduce((offset, chunk) => {
    joined.set(chunk, offset)
    return offset + chunk.byteLength
  }, 0)
  return joined
}
