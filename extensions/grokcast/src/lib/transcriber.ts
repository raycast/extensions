// Speech-to-text with the xAI SDK, as the signed-in user. No Raycast imports, so
// tests run it under plain Node with a fake `fetch`.

import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { SAMPLE_RATE } from "./recorder.ts"
import { callXai, describeXaiError, XaiClient, XaiFailureReason, type XaiSdkError } from "./xai.ts"

/** How long one transcription request may take. */
const REQUEST_TIMEOUT = Duration.seconds(60)

/** Transcription failed. `reason` picks what the UI offers, `message` is for the user. */
export class TranscriptionError extends Schema.TaggedError<TranscriptionError>()("TranscriptionError", {
  reason: XaiFailureReason,
  message: Schema.String,
}) {}

export class Transcript extends Schema.Class<Transcript>("Transcript")({
  text: Schema.String,
  /** Length of the audio in seconds, as xAI measured it. */
  seconds: Schema.Finite,
  /** The language xAI heard, such as `en`. */
  language: Schema.Option(Schema.String),
}) {}

export interface TranscribeOptions {
  /** A language code such as `en`. None lets xAI detect the language. */
  readonly language: Option.Option<string>
  /** Write spoken numbers, currencies, and units as digits. xAI needs a language for this. */
  readonly formatNumbers: boolean
}

const toTranscriptionError = (error: XaiSdkError) =>
  new TranscriptionError(
    describeXaiError(error, {
      feature: "speech-to-text",
      failed: "xAI could not transcribe the audio",
    }),
  )

const makeTranscriber = Effect.fn("Transcriber.make")(function* () {
  const { client } = yield* XaiClient

  const transcribe = Effect.fn("Transcriber.transcribe")(function* (
    audio: Uint8Array<ArrayBuffer>,
    options: TranscribeOptions,
  ) {
    const xai = yield* client.pipe(
      Effect.mapError((error) => new TranscriptionError({ reason: "failed", message: error.message })),
    )

    const language = Option.match(options.language, {
      onNone: () => ({}),
      onSome: (code) => ({ language: code, format: options.formatNumbers }),
    })

    const result = yield* callXai((signal) =>
      xai.voice.transcribe(
        {
          file: new Blob([audio]),
          audio_format: "pcm",
          sample_rate: SAMPLE_RATE,
          ...language,
        },
        // A 429 here is usually the plan's usage limit, so say so at once instead of waiting.
        { signal, maxRetries: 0, timeout: Duration.toMillis(REQUEST_TIMEOUT) },
      ),
    ).pipe(Effect.mapError(toTranscriptionError))

    return new Transcript({
      text: result.text.trim(),
      seconds: result.duration,
      language: Option.liftPredicate(result.language, (code) => code !== ""),
    })
  })

  return { transcribe }
})

/** Transcribes mono 16 kHz signed 16-bit little-endian PCM. */
export class Transcriber extends Context.Service<Transcriber>()("grokcast/Transcriber", {
  make: makeTranscriber(),
}) {
  static readonly layer = Layer.effect(Transcriber, Transcriber.make)
}
