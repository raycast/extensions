// Image generation and editing with the xAI SDK, as the signed-in user. No Raycast
// imports, so tests run it under plain Node with a fake `fetch`.

import type { ImageEditParams, ImageGenerateParams } from "@xai-official/sdk"
import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { callXai, describeXaiError, XaiClient, XaiFailureReason, type XaiSdkError } from "./xai.ts"

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

const toImageError = (editing: boolean) => (error: XaiSdkError) =>
  new ImageError(
    describeXaiError(error, {
      feature: editing ? "image editing" : "image generation",
      failed: editing ? "xAI could not edit the image" : "xAI could not make the image",
    }),
  )

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
const editInput = (sources: ReadonlyArray<Blob>) =>
  Arr.match(sources, {
    onEmpty: () => ({ images: [] }),
    onNonEmpty: (all) => (all.length === 1 ? { image: Arr.headNonEmpty(all) } : { images: all }),
  })

const makeImageGenerator = Effect.fn("ImageGenerator.make")(function* () {
  const { client } = yield* XaiClient

  const create = Effect.fn("ImageGenerator.create")(function* (request: ImageRequest) {
    const editing = request.sources.length > 0
    if (request.prompt.trim() === "") {
      return yield* failed("Describe the image first.")
    }
    if (request.sources.length > MAX_SOURCE_IMAGES) {
      return yield* failed(`Choose up to ${MAX_SOURCE_IMAGES} images to edit.`)
    }
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
    const response = yield* callXai((signal) =>
      editing
        ? xai.images.edit(
            // SAFETY: the SDK types `model` as required, but xAI's API makes it optional and
            // picks its current image model. Grokcast leaves it out so xAI's upgrades apply.
            { ...body, ...editInput(sources) } as ImageEditParams,
            options(signal),
          )
        : xai.images.generate(
            // SAFETY: as above, `model` is optional in xAI's API.
            body as ImageGenerateParams,
            options(signal),
          ),
    ).pipe(Effect.mapError(toImageError(editing)))
    const data = yield* Schema.decodeUnknownEffect(WireImages)(response.data).pipe(
      Effect.mapError(() => failed("xAI sent an image Grokcast could not read.")),
    )
    const images = toGenerated(data)
    if (!Arr.isArrayNonEmpty(images)) {
      return yield* failed("xAI did not send an image. Grok may have declined the prompt.")
    }
    return images
  })

  return ImageGenerator.of({ create })
})

export class ImageGenerator extends Context.Service<
  ImageGenerator,
  {
    /** Make images from the prompt, or edit `sources` with it. */
    readonly create: (
      request: ImageRequest,
    ) => Effect.Effect<Arr.NonEmptyReadonlyArray<GeneratedImage>, ImageError>
  }
>()("grokcast/ImageGenerator") {
  static readonly layer = Layer.effect(ImageGenerator, makeImageGenerator())
}
