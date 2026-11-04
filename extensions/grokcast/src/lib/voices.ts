// Grok's built-in voices and the user's custom voices, with the xAI SDK, as the
// signed-in user. No Raycast imports, so tests run it under plain Node with a fake
// `fetch`.

import type { CustomVoice, CustomVoiceUpdateParams, Voice } from "@xai-official/sdk"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as DateTime from "effect/DateTime"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { BYTES_PER_SAMPLE, joinChunks, SAMPLE_RATE } from "./recorder.ts"
import { callXai, describeXaiError, XaiClient, XaiFailureReason, XaiSdkError } from "./xai.ts"

/** How long a list or change may take. */
const REQUEST_TIMEOUT = Duration.seconds(30)

/** Uploading a reference clip and making the voice takes longer. */
const CREATE_TIMEOUT = Duration.minutes(3)

/** xAI makes a voice from up to 120 seconds of audio. */
export const MAX_REFERENCE_SECONDS = 120

/** Custom voices listed at most. */
const MAX_CUSTOM_VOICES = 500

/** A voices request failed. `reason` picks what the UI offers, `message` is for the user. */
export class VoicesError extends Schema.TaggedError<VoicesError>()("VoicesError", {
  reason: XaiFailureReason,
  message: Schema.String,
}) {}

export const VoiceGender = Schema.Literals(["male", "female", "neutral"])
export type VoiceGender = typeof VoiceGender.Type

export const VoiceAge = Schema.Literals(["young", "middle-aged", "old"])
export type VoiceAge = typeof VoiceAge.Type

export const VoiceUseCase = Schema.Literals([
  "conversational",
  "narration",
  "characters",
  "educational",
  "advertisement",
  "social_media",
  "entertainment",
])
export type VoiceUseCase = typeof VoiceUseCase.Type

export const VoiceTone = Schema.Literals([
  "warm",
  "casual",
  "professional",
  "friendly",
  "authoritative",
  "expressive",
  "calm",
])
export type VoiceTone = typeof VoiceTone.Type

/** The labels xAI keeps with a custom voice. None leaves a label empty. */
export class VoiceLabels extends Schema.Class<VoiceLabels>("VoiceLabels")({
  name: Schema.Option(Schema.String),
  description: Schema.Option(Schema.String),
  gender: Schema.Option(VoiceGender),
  accent: Schema.Option(Schema.String),
  age: Schema.Option(VoiceAge),
  /** A language code such as `en`. */
  language: Schema.Option(Schema.String),
  useCase: Schema.Option(VoiceUseCase),
  tone: Schema.Option(VoiceTone),
}) {
  static readonly empty = new VoiceLabels({
    name: Option.none(),
    description: Option.none(),
    gender: Option.none(),
    accent: Option.none(),
    age: Option.none(),
    language: Option.none(),
    useCase: Option.none(),
    tone: Option.none(),
  })
}

/** A built-in Grok voice, or one of the user's custom voices. */
export class GrokVoice extends Schema.Class<GrokVoice>("GrokVoice")({
  /** What Read Aloud and other commands send, such as `eve`. */
  id: Schema.String,
  name: Schema.String,
  custom: Schema.Boolean,
  /** As xAI gives them. Free text, so newer values still show. */
  gender: Schema.Option(Schema.String),
  language: Schema.Option(Schema.String),
  description: Schema.Option(Schema.String),
  accent: Schema.Option(Schema.String),
  age: Schema.Option(Schema.String),
  useCase: Schema.Option(Schema.String),
  tone: Schema.Option(Schema.String),
  /** When the custom voice was made, in milliseconds since 1970. */
  created: Schema.Option(Schema.Finite),
}) {}

/** A clip of someone speaking, for a new voice. */
export class ReferenceAudio extends Schema.Class<ReferenceAudio>("ReferenceAudio")({
  bytes: Schema.Uint8Array,
  /** Such as `sample.wav`. xAI reads the format from it. */
  filename: Schema.String,
}) {}

/** A label xAI may leave out, send as null, or send empty. */
const text = Option.filter((found: string) => found.trim() !== "")

export const fromBuiltIn = (voice: Voice): GrokVoice =>
  new GrokVoice({
    id: voice.voice_id,
    name: Option.getOrElse(text(Option.fromNullishOr(voice.name)), () => voice.voice_id),
    custom: false,
    gender: text(Option.fromNullishOr(voice.gender)),
    language: text(Option.fromNullishOr(voice.language)),
    description: Option.none(),
    accent: Option.none(),
    age: Option.none(),
    useCase: Option.none(),
    tone: Option.none(),
    created: Option.none(),
  })

export const fromCustom = (voice: CustomVoice): GrokVoice =>
  new GrokVoice({
    id: voice.voice_id,
    name: Option.getOrElse(text(Option.fromNullishOr(voice.name)), () => voice.voice_id),
    custom: true,
    gender: text(Option.fromNullishOr(voice.gender)),
    language: text(Option.fromNullishOr(voice.language)),
    description: text(Option.fromNullishOr(voice.description)),
    accent: text(Option.fromNullishOr(voice.accent)),
    age: text(Option.fromNullishOr(voice.age)),
    useCase: text(Option.fromNullishOr(voice.use_case)),
    tone: text(Option.fromNullishOr(voice.tone)),
    created: Option.map(DateTime.make(voice.created_at), DateTime.toEpochMillis),
  })

/** Only the labels that are set, for a new voice. */
const createLabels = (labels: VoiceLabels) =>
  Object.fromEntries(
    Arr.getSomes([
      Option.map(labels.name, (value) => ["name", value] as const),
      Option.map(labels.description, (value) => ["description", value] as const),
      Option.map(labels.gender, (value) => ["gender", value] as const),
      Option.map(labels.accent, (value) => ["accent", value] as const),
      Option.map(labels.age, (value) => ["age", value] as const),
      Option.map(labels.language, (value) => ["language", value] as const),
      Option.map(labels.useCase, (value) => ["use_case", value] as const),
      Option.map(labels.tone, (value) => ["tone", value] as const),
    ]),
  )

/** Every label, with `null` for an empty one, so an edit can clear a label. */
export const updateLabels = (labels: VoiceLabels): CustomVoiceUpdateParams => ({
  name: Option.getOrNull(labels.name),
  description: Option.getOrNull(labels.description),
  gender: Option.getOrNull(labels.gender),
  accent: Option.getOrNull(labels.accent),
  age: Option.getOrNull(labels.age),
  language: Option.getOrNull(labels.language),
  use_case: Option.getOrNull(labels.useCase),
  tone: Option.getOrNull(labels.tone),
})

/** The labels of a custom voice, for its edit form. Values xAI added later are left empty. */
export const labelsOf = (voice: GrokVoice): VoiceLabels =>
  new VoiceLabels({
    name: Option.some(voice.name),
    description: voice.description,
    gender: Option.flatMap(voice.gender, Schema.decodeUnknownOption(VoiceGender)),
    accent: voice.accent,
    age: Option.flatMap(voice.age, Schema.decodeUnknownOption(VoiceAge)),
    language: voice.language,
    useCase: Option.flatMap(voice.useCase, Schema.decodeUnknownOption(VoiceUseCase)),
    tone: Option.flatMap(voice.tone, Schema.decodeUnknownOption(VoiceTone)),
  })

/** Custom voices first, newest first; then built-in voices by name. */
const voiceOrder = Order.combine(
  Order.combine(
    Order.mapInput(Order.Boolean, (voice: GrokVoice) => !voice.custom),
    Order.flip(
      Order.mapInput(Order.Number, (voice: GrokVoice) => Option.getOrElse(voice.created, () => 0)),
    ),
  ),
  Order.mapInput(Order.String, (voice: GrokVoice) => voice.name.toLowerCase()),
)

/** A RIFF header in front of mono 16 kHz 16-bit PCM, so xAI can read a recording. */
export const wavOf = (pcm: Uint8Array): Uint8Array<ArrayBuffer> => {
  const header = new DataView(new ArrayBuffer(44))
  const ascii = (offset: number, value: string) =>
    Arr.forEach(Arr.fromIterable(value), (char, index) =>
      header.setUint8(offset + index, char.charCodeAt(0)),
    )
  ascii(0, "RIFF")
  header.setUint32(4, 36 + pcm.byteLength, true)
  ascii(8, "WAVE")
  ascii(12, "fmt ")
  header.setUint32(16, 16, true)
  header.setUint16(20, 1, true)
  header.setUint16(22, 1, true)
  header.setUint32(24, SAMPLE_RATE, true)
  header.setUint32(28, SAMPLE_RATE * BYTES_PER_SAMPLE, true)
  header.setUint16(32, BYTES_PER_SAMPLE, true)
  header.setUint16(34, BYTES_PER_SAMPLE * 8, true)
  ascii(36, "data")
  header.setUint32(40, pcm.byteLength, true)
  return joinChunks([new Uint8Array(header.buffer), pcm])
}

const toVoicesError = (failed: string) => (error: XaiSdkError) =>
  new VoicesError(describeXaiError(error, { feature: "custom voices", failed }))

const makeLibrary = Effect.fn("VoiceLibrary.make")(function* () {
  const { client } = yield* XaiClient

  const sdk = client.pipe(
    Effect.mapError((error) => new VoicesError({ reason: "failed", message: error.message })),
  )
  const options = (signal: AbortSignal, timeout = REQUEST_TIMEOUT) => ({
    signal,
    maxRetries: 0,
    timeout: Duration.toMillis(timeout),
  })

  const list = Effect.gen(function* () {
    const xai = yield* sdk
    const failed = toVoicesError("xAI could not list the voices")
    const [builtIn, custom] = yield* Effect.all(
      [
        callXai((signal) => xai.voice.list(options(signal))).pipe(Effect.mapError(failed)),
        Stream.fromAsyncIterable(
          // The SDK fetches the later pages as the stream reads.
          xai.voice.custom.list({ limit: 100 }, { maxRetries: 0 }),
          (cause) => new XaiSdkError({ cause }),
        ).pipe(Stream.take(MAX_CUSTOM_VOICES), Stream.runCollect, Effect.mapError(failed)),
      ],
      { concurrency: "unbounded" },
    )
    return Arr.sort(
      [...Arr.map(custom, fromCustom), ...Arr.map(builtIn.voices, fromBuiltIn)],
      voiceOrder,
    )
  }).pipe(Effect.withSpan("VoiceLibrary.list"))

  const create = Effect.fn("VoiceLibrary.create")(function* (
    audio: ReferenceAudio,
    labels: VoiceLabels,
  ) {
    const xai = yield* sdk
    const created = yield* callXai((signal) =>
      xai.voice.custom.create(
        {
          file: new File([new Uint8Array(audio.bytes)], audio.filename),
          ...createLabels(labels),
        },
        options(signal, CREATE_TIMEOUT),
      ),
    ).pipe(Effect.mapError(toVoicesError("xAI could not make the voice")))
    return fromCustom(created)
  })

  const update = Effect.fn("VoiceLibrary.update")(function* (id: string, labels: VoiceLabels) {
    const xai = yield* sdk
    const updated = yield* callXai((signal) =>
      xai.voice.custom.update(id, updateLabels(labels), options(signal)),
    ).pipe(Effect.mapError(toVoicesError("xAI could not change the voice")))
    return fromCustom(updated)
  })

  const remove = Effect.fn("VoiceLibrary.remove")(function* (id: string) {
    const xai = yield* sdk
    yield* callXai((signal) => xai.voice.custom.delete(id, options(signal))).pipe(
      Effect.mapError(toVoicesError("xAI could not delete the voice")),
    )
  })

  return VoiceLibrary.of({ list, create, update, remove })
})

export class VoiceLibrary extends Context.Service<
  VoiceLibrary,
  {
    /** The user's custom voices, newest first, then Grok's built-in voices. */
    readonly list: Effect.Effect<ReadonlyArray<GrokVoice>, VoicesError>
    /** Make a custom voice from a clip of up to 120 seconds. */
    readonly create: (
      audio: ReferenceAudio,
      labels: VoiceLabels,
    ) => Effect.Effect<GrokVoice, VoicesError>
    /** Replace a custom voice's labels. */
    readonly update: (id: string, labels: VoiceLabels) => Effect.Effect<GrokVoice, VoicesError>
    readonly remove: (id: string) => Effect.Effect<void, VoicesError>
  }
>()("grokcast/VoiceLibrary") {
  static readonly layer = Layer.effect(VoiceLibrary, makeLibrary())
}

const READ_ALOUD_VOICE_KEY = "read-aloud-voice"

/** The voice the user picked for Read Aloud in Grok Voices. */
export class ChosenVoice extends Schema.Class<ChosenVoice>("ChosenVoice")({
  id: Schema.String,
  name: Schema.String,
}) {}

const makeReadAloudVoice = Effect.fn("ReadAloudVoice.make")(function* () {
  const store = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, ChosenVoice)
  return ReadAloudVoice.of({
    // An unreadable record counts as no choice, so Read Aloud still reads.
    get: store.get(READ_ALOUD_VOICE_KEY).pipe(Effect.catch(() => Effect.succeedNone)),
    set: (voice) =>
      store
        .set(READ_ALOUD_VOICE_KEY, new ChosenVoice({ id: voice.id, name: voice.name }))
        .pipe(Effect.ignore),
    clear: store.remove(READ_ALOUD_VOICE_KEY).pipe(Effect.ignore),
  })
})

/**
 * The voice Read Aloud uses instead of its Voice preference. The preference is a
 * fixed list, so this is how a custom voice gets there.
 */
export class ReadAloudVoice extends Context.Service<
  ReadAloudVoice,
  {
    readonly get: Effect.Effect<Option.Option<ChosenVoice>>
    readonly set: (voice: GrokVoice) => Effect.Effect<void>
    readonly clear: Effect.Effect<void>
  }
>()("grokcast/ReadAloudVoice") {
  static readonly layer = Layer.effect(ReadAloudVoice, makeReadAloudVoice())
}
