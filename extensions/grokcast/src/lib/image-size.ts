// The pixel size of a JPEG, PNG, or WebP image, read from its header, and the grid
// shape that fits it best. No Raycast imports, so tests run it under plain Node.

import * as Arr from "effect/Array"
import * as Option from "effect/Option"
import * as Order from "effect/Order"
import type { AspectRatio } from "./images.ts"

export interface ImageSize {
  readonly width: number
  readonly height: number
}

const ascii = (bytes: Uint8Array, start: number, text: string) =>
  Arr.every(
    Arr.makeBy(text.length, (index) => index),
    (index) => bytes[start + index] === text.charCodeAt(index),
  )

const sizeOf = (width: number, height: number): Option.Option<ImageSize> =>
  width > 0 && height > 0 ? Option.some({ width, height }) : Option.none()

const png = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> =>
  bytes.length >= 24 && ascii(bytes, 1, "PNG") && ascii(bytes, 12, "IHDR")
    ? sizeOf(view.getUint32(16), view.getUint32(20))
    : Option.none()

/** SOF markers carry the frame size. C4 (DHT), C8 (JPG), and CC (DAC) are not frames. */
const isFrameMarker = (marker: number) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc

const jpeg = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> => {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return Option.none()
  const segment = (offset: number): Option.Option<ImageSize> => {
    if (offset + 9 > bytes.length || bytes[offset] !== 0xff) return Option.none()
    const marker = bytes[offset + 1] ?? 0
    // Fill bytes and markers without a length.
    if (marker === 0xff) return segment(offset + 1)
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)) return segment(offset + 2)
    if (isFrameMarker(marker)) {
      return sizeOf(view.getUint16(offset + 7), view.getUint16(offset + 5))
    }
    return segment(offset + 2 + view.getUint16(offset + 2))
  }
  return segment(2)
}

const webp = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> => {
  if (bytes.length < 30 || !ascii(bytes, 0, "RIFF") || !ascii(bytes, 8, "WEBP")) {
    return Option.none()
  }
  if (ascii(bytes, 12, "VP8X")) {
    const width = 1 + (view.getUint32(24, true) & 0xffffff)
    const height = 1 + (view.getUint32(27, true) & 0xffffff)
    return sizeOf(width, height)
  }
  if (ascii(bytes, 12, "VP8L")) {
    const bits = view.getUint32(21, true)
    return sizeOf(1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff))
  }
  if (ascii(bytes, 12, "VP8 ")) {
    return sizeOf(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff)
  }
  return Option.none()
}

/** The pixel size from the image's header, or none for another format or a damaged file. */
export const imageSize = (bytes: Uint8Array): Option.Option<ImageSize> => {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  return png(bytes, view).pipe(
    Option.orElse(() => jpeg(bytes, view)),
    Option.orElse(() => webp(bytes, view)),
  )
}

const RATIOS: Arr.NonEmptyReadonlyArray<readonly [AspectRatio, number]> = [
  ["1:1", 1],
  ["16:9", 16 / 9],
  ["9:16", 9 / 16],
  ["4:3", 4 / 3],
  ["3:4", 3 / 4],
  ["3:2", 3 / 2],
  ["2:3", 2 / 3],
]

/**
 * The aspect ratio closest to the image's shape. Shapes are compared on a log scale, so
 * 2:1 is as far from 1:1 as 1:2 is. xAI can make shapes wider than 16:9; those get 16:9.
 */
export const nearestAspectRatio = (size: ImageSize): AspectRatio => {
  const imageLogRatio = Math.log(size.width / size.height)
  const byDistance = Order.mapInput(Order.Number, ([, ratio]: readonly [AspectRatio, number]) =>
    Math.abs(Math.log(ratio) - imageLogRatio),
  )
  return Arr.min(RATIOS, byDistance)[0]
}
