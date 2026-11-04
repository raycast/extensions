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
  const type = Option.fromNullishOr(FORMATS.get(extname(path).toLowerCase()))
  if (Option.isNone(type)) {
    return yield* new ImageError({
      path,
      message: `${name} is not a JPEG, PNG, or WebP image.`,
    })
  }
  const unreadable = () => new ImageError({ path, message: `Could not read ${name}.` })
  const info = yield* Effect.tryPromise({ try: () => stat(path), catch: unreadable })
  if (info.size > MAX_IMAGE_BYTES) {
    return yield* new ImageError({ path, message: `${name} is larger than 20 MB.` })
  }
  const bytes = yield* Effect.tryPromise({ try: () => readFile(path), catch: unreadable })
  return new Blob([new Uint8Array(bytes)], { type: type.value })
})

export class ChatImages extends Context.Service<
  ChatImages,
  {
    /** Read a JPEG, PNG, or WebP image of at most `MAX_IMAGE_BYTES`. */
    readonly read: (path: string) => Effect.Effect<Blob, ImageError>
  }
>()("grokcast/ChatImages") {
  static readonly layer = Layer.succeed(ChatImages, ChatImages.of({ read }))
}
