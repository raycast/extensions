// Images the user attaches to a chat question, read from files on this Mac. No
// Raycast imports, so tests run it under plain Node.

import { readFile, stat } from "node:fs/promises"
import { basename, extname } from "node:path"
import { pathToFileURL } from "node:url"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"

/** xAI accepts images up to this size. */
export const MAX_IMAGE_BYTES = 20 * 1024 * 1024

/** The formats xAI's image understanding reads, by file extension, with their MIME types. */
const FORMATS = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
])

/** True when `path` looks like an image Grok can read, by its extension. */
export const isSupportedImage = (path: string): boolean => FORMATS.has(extname(path).toLowerCase())

/** An image could not be attached. `message` is for the user. */
export class ImageError extends Schema.TaggedError<ImageError>()("ImageError", {
  path: Schema.String,
  message: Schema.String,
}) {}

/** A Markdown image for the detail pane, kept small. */
export const imageMarkdown = (path: string): string =>
  `![${basename(path).replaceAll("[", "(").replaceAll("]", ")")}](${pathToFileURL(path).href}?raycast-height=160)`

const read = Effect.fn("ChatImages.read")(function* (path: string) {
  const name = basename(path)
  const unreadable = () => new ImageError({ path, message: `Could not read ${name}.` })

  const type = yield* Effect.fromOption(
    Option.fromNullishOr(FORMATS.get(extname(path).toLowerCase())),
    () => new ImageError({ path, message: `${name} is not a JPEG, PNG, or WebP image.` }),
  )

  yield* Effect.tryPromise({ try: () => stat(path), catch: unreadable }).pipe(
    Effect.filterOrFail(
      (info) => info.size <= MAX_IMAGE_BYTES,
      () => new ImageError({ path, message: `${name} is larger than 20 MB.` }),
    ),
  )

  const bytes = yield* Effect.tryPromise({ try: () => readFile(path), catch: unreadable })

  return new Blob([new Uint8Array(bytes)], { type })
})

export class ChatImages extends Context.Service<ChatImages>()("grokcast/ChatImages", {
  /** `read` reads a JPEG, PNG, or WebP image of at most `MAX_IMAGE_BYTES`. */
  make: Effect.succeed({ read }),
}) {
  static readonly layer = Layer.effect(ChatImages, ChatImages.make)
}
