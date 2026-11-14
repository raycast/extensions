// Images Grok made, newest first. The files live in a folder on this Mac (the
// extension's support folder in Raycast), and the list of them in a key-value store
// (Raycast's LocalStorage). No Raycast imports, so tests run it under plain Node.

import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { imageSize } from "./image-size.ts"
import { AspectRatio, Resolution, type GeneratedImage, type ImageRequest } from "./images.ts"

/** The library keeps this many images and deletes older ones. */
export const MAX_IMAGES = 200

const KEY = "image-library"

/** A file in the image folder could not be written or deleted. */
export class ImageFileError extends Schema.TaggedError<ImageFileError>()("ImageFileError", {
  message: Schema.String,
  cause: Schema.Defect(),
}) {}

/** Run a file operation on the image folder. A failure becomes an `ImageFileError` with `message`. */
export const imageFileCall = <A>(message: string, call: () => Promise<A>) =>
  Effect.tryPromise({ try: call, catch: (cause) => new ImageFileError({ message, cause }) })

/** The folder that holds the image files. The extension uses its support folder. */
export class ImageFiles extends Context.Service<
  ImageFiles,
  {
    /** Write `bytes` to the file `name` and return its full path. */
    readonly write: (name: string, bytes: Uint8Array) => ReturnType<typeof imageFileCall<string>>
    /** Delete the file at `path`. A missing file is not an error. */
    readonly remove: (path: string) => ReturnType<typeof imageFileCall<void>>
  }
>()("grokcast/ImageFiles") {}

export class ImageEntry extends Schema.Class<ImageEntry>("ImageEntry")({
  id: Schema.String,
  prompt: Schema.String,
  /** Full path of the image file. */
  path: Schema.String,
  mimeType: Schema.String,
  /** Unix time in milliseconds. */
  createdAt: Schema.Finite,
  /** True when Grok edited images instead of making a new one. */
  edited: Schema.Boolean,
  aspectRatio: Schema.OptionFromOptionalKey(AspectRatio),
  resolution: Schema.OptionFromOptionalKey(Resolution),
  /** Pixel size read from the file. xAI picks the shape when no aspect ratio is asked for. */
  width: Schema.OptionFromOptionalKey(Schema.Int),
  height: Schema.OptionFromOptionalKey(Schema.Int),
}) {}

const Entries = Schema.Array(ImageEntry)

/** The file extension for an image MIME type. xAI sends JPEG unless it says otherwise. */
export const extensionFor = (mimeType: string): string =>
  Match.value(mimeType.toLowerCase()).pipe(
    Match.when("image/png", () => "png"),
    Match.when("image/webp", () => "webp"),
    Match.orElse(() => "jpg"),
  )

const makeLibrary = Effect.fn("ImageLibrary.make")(function* () {
  const store = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, Entries)
  const files = yield* ImageFiles
  const lock = yield* Semaphore.make(1)

  /** An unreadable list (an older format, or a damaged value) counts as empty. */
  const list = store.get(KEY).pipe(
    Effect.map(Option.getOrElse((): ReadonlyArray<ImageEntry> => [])),
    Effect.catch(() => Effect.succeed<ReadonlyArray<ImageEntry>>([])),
    Effect.withSpan("ImageLibrary.list"),
  )

  /** Files of dropped entries are deleted on a best-effort basis. */
  const removeFiles = (entries: ReadonlyArray<ImageEntry>) =>
    Effect.forEach(entries, (entry) => Effect.ignore(files.remove(entry.path)), { discard: true })

  /** Save the images Grok made for `request`, and return their entries. */
  const add = Effect.fn("ImageLibrary.add")(function* (request: ImageRequest, images: ReadonlyArray<GeneratedImage>) {
    const createdAt = yield* Clock.currentTimeMillis

    const save = Effect.fn("ImageLibrary.save")(function* (image: GeneratedImage, index: number) {
      const id = `${createdAt}-${index}`
      const size = imageSize(image.bytes)
      const path = yield* files.write(`${id}.${extensionFor(image.mimeType)}`, image.bytes)

      return new ImageEntry({
        id,
        prompt: request.prompt,
        path,
        mimeType: image.mimeType,
        createdAt,
        edited: request.sources.length > 0,
        aspectRatio: request.aspectRatio,
        resolution: request.resolution,
        width: Option.map(size, (value) => value.width),
        height: Option.map(size, (value) => value.height),
      })
    })

    const added = yield* Effect.forEach(images, save)

    yield* lock.withPermits(1)(
      Effect.gen(function* () {
        const ids = new Set(Arr.map(added, (entry) => entry.id))

        const all = Arr.appendAll(
          added,
          Arr.filter(yield* list, (old) => !ids.has(old.id)),
        )

        yield* store.set(KEY, Arr.take(all, MAX_IMAGES))
        yield* removeFiles(Arr.drop(all, MAX_IMAGES))
      }),
    )

    return added
  })

  const remove = Effect.fn("ImageLibrary.remove")(function* (id: string) {
    yield* lock.withPermits(1)(
      Effect.gen(function* () {
        const all = yield* list
        const gone = Arr.filter(all, (entry) => entry.id === id)
        const kept = Arr.filter(all, (entry) => entry.id !== id)
        yield* store.set(KEY, kept)
        yield* removeFiles(gone)
      }),
    )
  })

  const clear = Effect.fn("ImageLibrary.clear")(function* () {
    yield* lock.withPermits(1)(
      Effect.gen(function* () {
        const all = yield* list
        yield* store.remove(KEY)
        yield* removeFiles(all)
      }),
    )
  })

  return { list, add, remove, clear: clear() }
})

export class ImageLibrary extends Context.Service<ImageLibrary>()("grokcast/ImageLibrary", {
  make: makeLibrary(),
}) {
  static readonly layer = Layer.effect(ImageLibrary, ImageLibrary.make)
}
