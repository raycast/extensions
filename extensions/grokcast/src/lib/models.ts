// The Grok models the signed-in user can use, and token counts, with the xAI SDK.
// No Raycast imports, so tests run it under plain Node with a fake `fetch`.

import type { ImageGenerationModel, LanguageModel, VideoGenerationModel } from "@xai-official/sdk"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import * as Schema from "effect/Schema"
import { callXai, describeXaiError, XaiClient, XaiFailureReason, type XaiSdkError } from "./xai.ts"

/** How long one list or token request may take. */
const REQUEST_TIMEOUT = Duration.seconds(30)

/** A models or token request failed. `reason` picks what the UI offers, `message` is for the user. */
export class ModelsError extends Schema.TaggedError<ModelsError>()("ModelsError", {
  reason: XaiFailureReason,
  message: Schema.String,
}) {}

/** What a model makes. */
export const ModelKind = Schema.Literals(["language", "image", "video"])
export type ModelKind = typeof ModelKind.Type

/** One Grok model, as xAI describes it. Prices are left out: a subscription does not pay per token. */
export class GrokModel extends Schema.Class<GrokModel>("GrokModel")({
  id: Schema.String,
  kind: ModelKind,
  /** Other names a request can use for this model, such as `grok-latest`. */
  aliases: Schema.Array(Schema.String),
  /** Such as `text` and `image`. */
  inputs: Schema.Array(Schema.String),
  outputs: Schema.Array(Schema.String),
  version: Schema.String,
  /** When xAI added the model, in milliseconds since 1970. */
  created: Schema.Finite,
  /** The most tokens a request can hold. Language models only. */
  contextLength: Schema.Option(Schema.Int),
  /** The reasoning efforts the model accepts, such as `low` and `high`. */
  reasoningEfforts: Schema.Array(Schema.String),
  /** The longest prompt in characters. Image models only. */
  maxPromptLength: Schema.Option(Schema.Int),
}) {}

/** One token of a text, as the model reads it. */
export class Token extends Schema.Class<Token>("Token")({
  id: Schema.Int,
  text: Schema.String,
}) {}

const toModelsError = (failed: string) => (error: XaiSdkError) =>
  new ModelsError(describeXaiError(error, { feature: "model information", failed }))

const positive = (value: Option.Option<number>) => Option.filter(value, (number) => number > 0)

/** xAI gives `created` in seconds. */
const base = (
  model: LanguageModel | ImageGenerationModel | VideoGenerationModel,
  kind: ModelKind,
) => ({
  id: model.id,
  kind,
  aliases: model.aliases,
  inputs: model.input_modalities,
  outputs: model.output_modalities,
  version: model.version,
  created: model.created * 1000,
  contextLength: Option.none<number>(),
  reasoningEfforts: [],
  maxPromptLength: Option.none<number>(),
})

export const fromLanguageModel = (
  model: LanguageModel,
  contextLengths: ReadonlyMap<string, number>,
): GrokModel =>
  new GrokModel({
    ...base(model, "language"),
    contextLength: positive(Option.fromNullishOr(contextLengths.get(model.id))),
    reasoningEfforts: Option.match(Option.fromNullishOr(model.capabilities), {
      onNone: () => [],
      onSome: (capabilities) => capabilities.reasoning_effort,
    }),
  })

export const fromImageModel = (model: ImageGenerationModel): GrokModel =>
  new GrokModel({
    ...base(model, "image"),
    maxPromptLength: positive(Option.some(model.max_prompt_length)),
  })

export const fromVideoModel = (model: VideoGenerationModel): GrokModel =>
  new GrokModel(base(model, "video"))

/** Newest first, then by name. */
const newestFirst = Order.combine(
  Order.flip(Order.mapInput(Order.Number, (model: GrokModel) => model.created)),
  Order.mapInput(Order.String, (model: GrokModel) => model.id),
)

const makeCatalog = Effect.fn("ModelCatalog.make")(function* () {
  const { client } = yield* XaiClient

  const sdk = client.pipe(
    Effect.mapError((error) => new ModelsError({ reason: "failed", message: error.message })),
  )
  const options = (signal: AbortSignal) => ({
    signal,
    maxRetries: 0,
    timeout: Duration.toMillis(REQUEST_TIMEOUT),
  })

  const list = Effect.gen(function* () {
    const xai = yield* sdk
    const failed = toModelsError("xAI could not list the models")
    const [language, image, video, contextLengths] = yield* Effect.all(
      [
        callXai((signal) => xai.models.language.list(options(signal))).pipe(
          Effect.mapError(failed),
        ),
        callXai((signal) => xai.models.image.list(options(signal))).pipe(Effect.mapError(failed)),
        callXai((signal) => xai.models.video.list(options(signal))).pipe(Effect.mapError(failed)),
        // Only the general list gives context lengths. Without it, the rest still shows.
        callXai((signal) => xai.models.list(options(signal))).pipe(
          Effect.map(
            (all) =>
              new Map(
                Arr.flatMap(all.data, (model) =>
                  Option.match(Option.fromNullishOr(model.context_length), {
                    onNone: () => [],
                    onSome: (length) => [[model.id, length] as const],
                  }),
                ),
              ),
          ),
          Effect.orElseSucceed(() => new Map<string, number>()),
        ),
      ],
      { concurrency: "unbounded" },
    )
    return Arr.sort(
      [
        ...Arr.map(language.models, (model) => fromLanguageModel(model, contextLengths)),
        ...Arr.map(image.models, fromImageModel),
        ...Arr.map(video.models, fromVideoModel),
      ],
      newestFirst,
    )
  }).pipe(Effect.withSpan("ModelCatalog.list"))

  const tokenize = Effect.fn("ModelCatalog.tokenize")(function* (model: string, text: string) {
    const xai = yield* sdk
    const result = yield* callXai((signal) =>
      xai.tokenizer.encode({ model, text }, options(signal)),
    ).pipe(Effect.mapError(toModelsError("xAI could not count the tokens")))
    return Arr.map(
      result.token_ids,
      (token) => new Token({ id: token.token_id, text: token.string_token }),
    )
  })

  return ModelCatalog.of({ list, tokenize })
})

export class ModelCatalog extends Context.Service<
  ModelCatalog,
  {
    /** Every language, image, and video model, newest first. */
    readonly list: Effect.Effect<ReadonlyArray<GrokModel>, ModelsError>
    /** Split `text` into tokens the way language model `model` reads it. */
    readonly tokenize: (
      model: string,
      text: string,
    ) => Effect.Effect<ReadonlyArray<Token>, ModelsError>
  }
>()("grokcast/ModelCatalog") {
  static readonly layer = Layer.effect(ModelCatalog, makeCatalog())
}
