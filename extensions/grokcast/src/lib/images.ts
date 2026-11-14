// Image generation and editing with the xAI SDK, as the signed-in user. No Raycast
// imports, so tests run it under plain Node with a fake `fetch`.

import type { ImageEditParams, ImageGenerateParams } from "@xai-official/sdk"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import {
  callXai,
  describeXaiError,
  XaiClient,
  XaiFailureReason,
  type XaiFeatureWording,
  type XaiSdkError,
} from "./xai.ts"

/** How long one image request may take. Several 2K images can take a while. */
const REQUEST_TIMEOUT = Duration.minutes(3)

/** xAI accepts up to 10 images per request. Grokcast offers fewer to keep the grid readable. */
export const MAX_IMAGE_COUNT = 4

/** xAI edits with up to this many source images. */
export const MAX_SOURCE_IMAGES = 3

/** The aspect ratios Grokcast offers. xAI accepts a few more. */
export const AspectRatio = Schema.Literals(["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3"])

export type AspectRatio = typeof AspectRatio.Type

export const Resolution = Schema.Literals(["1k", "2k"])

export type Resolution = typeof Resolution.Type

/** Image generation or editing failed. `reason` picks what the UI offers, `message` is for the user. */
export class ImageError extends Schema.TaggedError<ImageError>()("ImageError", {
  reason: XaiFailureReason,
  message: Schema.String,
}) {}

/** An image to edit: its bytes and MIME type, such as `image/png`. */
export class SourceImage extends Schema.Class<SourceImage>("SourceImage")({
  bytes: Schema.Uint8Array,
  mimeType: Schema.String,
}) {}

/** An image xAI made. */
export class GeneratedImage extends Schema.Class<GeneratedImage>("GeneratedImage")({
  bytes: Schema.Uint8Array,
  mimeType: Schema.String,
}) {}

export interface ImageRequest {
  readonly prompt: string
  /** None lets xAI choose. */
  readonly aspectRatio: Option.Option<AspectRatio>
  /** None lets xAI choose (1K today). */
  readonly resolution: Option.Option<Resolution>
  /** From 1 to `MAX_IMAGE_COUNT`. */
  readonly count: number
  /** Images to edit. Empty makes new images from the prompt. */
  readonly sources: ReadonlyArray<SourceImage>
}

/** xAI's MIME type when it does not say: its default output is JPEG. */
const DEFAULT_MIME_TYPE = "image/jpeg"

const WireImage = Schema.Struct({
  b64_json: Schema.optional(Schema.NullOr(Schema.Uint8ArrayFromBase64)),
  mime_type: Schema.optional(Schema.NullOr(Schema.String)),
})

const WireImages = Schema.Array(WireImage)

const failed = (message: string) => new ImageError({ reason: "failed", message })

/** How a failed request is put to the user, for new images and for edits. */
const GENERATE_WORDING: XaiFeatureWording = {
  feature: "image generation",
  failed: "xAI could not make the image",
}

const EDIT_WORDING: XaiFeatureWording = {
  feature: "image editing",
  failed: "xAI could not edit the image",
}

const toImageError = (wording: XaiFeatureWording) => (error: XaiSdkError) =>
  new ImageError(describeXaiError(error, wording))

const toGenerated = (data: ReadonlyArray<typeof WireImage.Type>) =>
  Arr.getSomes(
    Arr.map(data, (image) =>
      Option.map(
        Option.fromNullishOr(image.b64_json),
        (bytes) =>
          new GeneratedImage({
            bytes,
            mimeType: Option.getOrElse(
              Option.fromNullishOr(image.mime_type).pipe(Option.filter((type) => type !== "")),
              () => DEFAULT_MIME_TYPE,
            ),
          }),
      ),
    ),
  )

/** The request body both endpoints share. The model is left out on purpose: see below. */
const commonBody = (request: ImageRequest) => ({
  prompt: request.prompt,
  n: Math.min(Math.max(Math.round(request.count), 1), MAX_IMAGE_COUNT),
  response_format: "b64_json" as const,
  ...Option.match(request.aspectRatio, {
    onNone: () => ({}),
    onSome: (aspect_ratio) => ({ aspect_ratio }),
  }),
  ...Option.match(request.resolution, {
    onNone: () => ({}),
    onSome: (resolution) => ({ resolution }),
  }),
})

/** One image goes in `image`. Several go in `images`, which the prompt can name as `<IMAGE_0>` and so on. */
const editInput = (sources: Arr.NonEmptyReadonlyArray<Blob>) =>
  Match.value(sources.length).pipe(
    Match.when(1, () => ({ image: Arr.headNonEmpty(sources) })),
    Match.orElse(() => ({ images: sources })),
  )

/** Why `request` cannot be sent, when it cannot. */
const problemOf = (request: ImageRequest): Option.Option<string> =>
  Match.value(request).pipe(
    Match.when({ prompt: (prompt) => prompt.trim() === "" }, () => Option.some("Describe the image first.")),
    Match.when({ sources: (sources) => sources.length > MAX_SOURCE_IMAGES }, () =>
      Option.some(`Choose up to ${MAX_SOURCE_IMAGES} images to edit.`),
    ),
    Match.orElse(() => Option.none()),
  )

const makeImageGenerator = Effect.fn("ImageGenerator.make")(function* () {
  const { client } = yield* XaiClient

  /** Make images from the prompt, or edit `sources` with it. */
  const create = Effect.fn("ImageGenerator.create")(function* (request: ImageRequest) {
    yield* Option.match(problemOf(request), {
      onNone: () => Effect.void,
      onSome: (message) => Effect.fail(failed(message)),
    })

    const xai = yield* client.pipe(Effect.mapError((error) => failed(error.message)))

    // A 429 here is usually the plan's usage limit, so say so at once instead of waiting.
    const options = (signal: AbortSignal) => ({
      signal,
      maxRetries: 0,
      timeout: Duration.toMillis(REQUEST_TIMEOUT),
    })

    const body = commonBody(request)

    const sources = Arr.map(
      request.sources,
      (source) => new Blob([new Uint8Array(source.bytes)], { type: source.mimeType }),
    )

    const job = Arr.match(sources, {
      onEmpty: () => ({
        wording: GENERATE_WORDING,
        send: (signal: AbortSignal) =>
          xai.images.generate(
            // SAFETY: the SDK types `model` as required, but xAI's API makes it optional and
            // picks its current image model. Grokcast leaves it out so xAI's upgrades apply.
            body as ImageGenerateParams,
            options(signal),
          ),
      }),
      onNonEmpty: (all) => ({
        wording: EDIT_WORDING,
        send: (signal: AbortSignal) =>
          xai.images.edit(
            // SAFETY: as above, `model` is optional in xAI's API.
            { ...body, ...editInput(all) } as ImageEditParams,
            options(signal),
          ),
      }),
    })

    const response = yield* callXai(job.send).pipe(Effect.mapError(toImageError(job.wording)))

    const data = yield* Schema.decodeUnknownEffect(WireImages)(response.data).pipe(
      Effect.mapError(() => failed("xAI sent an image Grokcast could not read.")),
    )

    return yield* Arr.match(toGenerated(data), {
      onEmpty: () => Effect.fail(failed("xAI did not send an image. Grok may have declined the prompt.")),
      onNonEmpty: (images) => Effect.succeed(images),
    })
  })

  return { create }
})

export class ImageGenerator extends Context.Service<ImageGenerator>()("grokcast/ImageGenerator", {
  make: makeImageGenerator(),
}) {
  static readonly layer = Layer.effect(ImageGenerator, ImageGenerator.make)
}
