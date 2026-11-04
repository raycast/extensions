// Text-to-speech with the xAI SDK, as the signed-in user. No Raycast imports, so
// tests run it under plain Node with a fake `fetch`.

import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { callXai, describeXaiError, XaiClient, XaiFailureReason, type XaiSdkError } from "./xai.ts"

/** The most text xAI turns into speech in one request. */
export const MAX_SPEECH_CHARACTERS = 60_000

/** xAI accepts speeds from 0.7 to 1.5. */
export const MIN_SPEED = 0.7
export const MAX_SPEED = 1.5

/** How long one speech request may take. Long text takes a while to speak. */
const REQUEST_TIMEOUT = Duration.minutes(5)

/** Speech failed. `reason` picks what the UI offers, `message` is for the user. */
export class SpeechError extends Schema.TaggedError<SpeechError>()("SpeechError", {
  reason: Schema.Union([XaiFailureReason, Schema.Literals(["noText", "tooLong"])]),
  message: Schema.String,
}) {}

export class SpeechSettings extends Schema.Class<SpeechSettings>("SpeechSettings")({
  /** A built-in or custom voice ID such as `eve`. None uses xAI's default voice. */
  voice: Schema.Option(Schema.String),
  /** From 0.7 to 1.5. None uses xAI's default speed. */
  speed: Schema.Option(Schema.Finite),
  /** A BCP-47 code such as `en` or `pt-BR`, or `auto` to let xAI detect it. */
  language: Schema.String,
}) {}

/** The user's Read Aloud preferences. */
export class SpeechPreferences extends Context.Service<SpeechPreferences, SpeechSettings>()(
  "grokcast/SpeechPreferences",
) {}

/** The dropdown value for "xAI Default". */
export const XAI_DEFAULT = "default"

/** A preference value, or None for "xAI Default" or an empty value. */
export const optionalPreference = (value: string): Option.Option<string> =>
  Option.liftPredicate(value.trim(), (trimmed) => trimmed !== "" && trimmed !== XAI_DEFAULT)

/** A speed preference such as `1.25`. None for the default or a value xAI does not accept. */
export const speedFromPreference = (value: string): Option.Option<number> =>
  optionalPreference(value).pipe(
    Option.map(Number),
    Option.filter((speed) => Number.isFinite(speed) && speed >= MIN_SPEED && speed <= MAX_SPEED),
  )

/** Speech from xAI: MP3 audio. */
export class Speech extends Schema.Class<Speech>("Speech")({
  audio: Schema.Uint8Array,
  /** Characters of text that were spoken. */
  characters: Schema.Finite,
}) {}

const toSpeechError = (error: XaiSdkError) =>
  new SpeechError(
    describeXaiError(error, {
      feature: "text-to-speech",
      failed: "xAI could not read the text aloud",
    }),
  )

/** Check that there is something to read and that xAI accepts its length. */
export const checkText = (text: string): Effect.Effect<string, SpeechError> => {
  const trimmed = text.trim()
  if (trimmed === "") {
    return Effect.fail(new SpeechError({ reason: "noText", message: "There is no text to read." }))
  }
  if (trimmed.length > MAX_SPEECH_CHARACTERS) {
    return Effect.fail(
      new SpeechError({
        reason: "tooLong",
        message: `The text is too long to read aloud. Grok reads up to ${MAX_SPEECH_CHARACTERS.toLocaleString("en-US")} characters at a time.`,
      }),
    )
  }
  return Effect.succeed(trimmed)
}

const makeSpeaker = Effect.fn("Speaker.make")(function* () {
  const { client } = yield* XaiClient

  const speak = Effect.fn("Speaker.speak")(function* (text: string, settings: SpeechSettings) {
    const checked = yield* checkText(text)
    const xai = yield* client.pipe(
      Effect.mapError((error) => new SpeechError({ reason: "failed", message: error.message })),
    )
    const voice = Option.match(settings.voice, {
      onNone: () => ({}),
      onSome: (voiceId) => ({ voice_id: voiceId }),
    })
    const speed = Option.match(settings.speed, {
      onNone: () => ({}),
      onSome: (value) => ({ speed: value }),
    })
    const audio = yield* callXai(async (signal) => {
      const response = await xai.voice.speak(
        {
          text: checked,
          language: settings.language,
          output_format: { codec: "mp3" },
          ...voice,
          ...speed,
        },
        // A 429 here is usually the plan's usage limit, so say so at once instead of waiting.
        { signal, maxRetries: 0, timeout: Duration.toMillis(REQUEST_TIMEOUT) },
      )
      return response.bytes()
    }).pipe(Effect.mapError(toSpeechError))
    return new Speech({ audio, characters: checked.length })
  })

  return Speaker.of({ speak })
})

export class Speaker extends Context.Service<
  Speaker,
  {
    /** Turn text into MP3 speech. */
    readonly speak: (text: string, settings: SpeechSettings) => Effect.Effect<Speech, SpeechError>
  }
>()("grokcast/Speaker") {
  static readonly layer = Layer.effect(Speaker, makeSpeaker())
}
