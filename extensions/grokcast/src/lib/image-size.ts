// The pixel size of a JPEG, PNG, or WebP image, read from its header, and the grid
// shape that fits it best. No Raycast imports, so tests run it under plain Node.

import * as Arr from "effect/Array"
import * as Match from "effect/Match"
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
  Option.liftPredicate({ width, height }, (size) => size.width > 0 && size.height > 0)

const png = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> =>
  Option.liftPredicate(
    bytes,
    (header) => header.length >= 24 && ascii(header, 1, "PNG") && ascii(header, 12, "IHDR"),
  ).pipe(Option.flatMap(() => sizeOf(view.getUint32(16), view.getUint32(20))))

/** SOF markers carry the frame size. C4 (DHT), C8 (JPG), and CC (DAC) are not frames. */
const isFrameMarker = (marker: number) =>
  marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc

const isStandaloneMarker = (marker: number) => marker === 0x01 || (marker >= 0xd0 && marker <= 0xd8)

const jpegMarker = (bytes: Uint8Array, view: DataView, offset: number, marker: number): Option.Option<ImageSize> =>
  Match.value(marker).pipe(
    // Fill bytes and markers without a length.
    Match.when(0xff, () => jpegSegment(bytes, view, offset + 1)),
    Match.when(isStandaloneMarker, () => jpegSegment(bytes, view, offset + 2)),
    Match.when(isFrameMarker, () => sizeOf(view.getUint16(offset + 7), view.getUint16(offset + 5))),
    Match.orElse(() => jpegSegment(bytes, view, offset + 2 + view.getUint16(offset + 2))),
  )

const jpegSegment = (bytes: Uint8Array, view: DataView, offset: number): Option.Option<ImageSize> =>
  Option.liftPredicate(offset, (start) => start + 9 <= bytes.length && bytes[start] === 0xff).pipe(
    Option.flatMap((start) => jpegMarker(bytes, view, start, bytes[start + 1] ?? 0)),
  )

const jpeg = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> =>
  Option.liftPredicate(bytes, (header) => header.length >= 4 && header[0] === 0xff && header[1] === 0xd8).pipe(
    Option.flatMap(() => jpegSegment(bytes, view, 2)),
  )

const webpChunk = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> =>
  Match.value(String.fromCharCode(...bytes.subarray(12, 16))).pipe(
    Match.when("VP8X", () =>
      sizeOf(1 + (view.getUint32(24, true) & 0xffffff), 1 + (view.getUint32(27, true) & 0xffffff)),
    ),
    Match.when("VP8L", () => losslessSize(view.getUint32(21, true))),
    Match.when("VP8 ", () => sizeOf(view.getUint16(26, true) & 0x3fff, view.getUint16(28, true) & 0x3fff)),
    Match.orElse(() => Option.none()),
  )

const losslessSize = (bits: number) => sizeOf(1 + (bits & 0x3fff), 1 + ((bits >> 14) & 0x3fff))

const webp = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> =>
  Option.liftPredicate(
    bytes,
    (header) => header.length >= 30 && ascii(header, 0, "RIFF") && ascii(header, 8, "WEBP"),
  ).pipe(Option.flatMap(() => webpChunk(bytes, view)))

const sizeFromHeader = (bytes: Uint8Array, view: DataView): Option.Option<ImageSize> =>
  png(bytes, view).pipe(
    Option.orElse(() => jpeg(bytes, view)),
    Option.orElse(() => webp(bytes, view)),
  )

/** The pixel size from the image's header, or none for another format or a damaged file. */
export const imageSize = (bytes: Uint8Array): Option.Option<ImageSize> =>
  sizeFromHeader(bytes, new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength))

const RATIOS: Arr.NonEmptyReadonlyArray<readonly [AspectRatio, number]> = [
  ["1:1", 1],
  ["16:9", 16 / 9],
  ["9:16", 9 / 16],
  ["4:3", 4 / 3],
  ["3:4", 3 / 4],
  ["3:2", 3 / 2],
  ["2:3", 2 / 3],
]

const distanceFrom = (imageLogRatio: number) =>
  Order.mapInput(Order.Number, ([, ratio]: readonly [AspectRatio, number]) => Math.abs(Math.log(ratio) - imageLogRatio))

/**
 * The aspect ratio closest to the image's shape. Shapes are compared on a log scale, so
 * 2:1 is as far from 1:1 as 1:2 is. xAI can make shapes wider than 16:9; those get 16:9.
 */
export const nearestAspectRatio = (size: ImageSize): AspectRatio =>
  Arr.min(RATIOS, distanceFrom(Math.log(size.width / size.height)))[0]
