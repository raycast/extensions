import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Option from "effect/Option"
import { imageSize, nearestAspectRatio } from "../src/lib/image-size.ts"
import { pngHeader } from "./support.ts"

/** A JPEG with an APP0 segment before the SOF0 frame header. */
const jpegHeader = (width: number, height: number) => {
  const bytes = new Uint8Array([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x04, 0x00, 0x00, 0xff, 0xc0, 0x00, 0x11, 0x08, 0, 0, 0, 0, 0x03,
  ])
  const view = new DataView(bytes.buffer)
  view.setUint16(13, height)
  view.setUint16(15, width)
  return bytes
}

const riff = (chunk: string) => {
  const bytes = new Uint8Array(40)
  bytes.set(new TextEncoder().encode(`RIFF\0\0\0\0WEBP${chunk}`), 0)
  return { bytes, view: new DataView(bytes.buffer) }
}

const webpExtended = (width: number, height: number) => {
  const { bytes, view } = riff("VP8X")
  view.setUint32(24, (width - 1) & 0xffffff, true)
  view.setUint32(27, (height - 1) & 0xffffff, true)
  return bytes
}

const webpLossless = (width: number, height: number) => {
  const { bytes, view } = riff("VP8L")
  view.setUint32(21, (width - 1) | ((height - 1) << 14), true)
  return bytes
}

const webpLossy = (width: number, height: number) => {
  const { bytes, view } = riff("VP8 ")
  view.setUint16(26, width, true)
  view.setUint16(28, height, true)
  return bytes
}

describe("imageSize", () => {
  it("reads PNG, JPEG, and WebP headers", () => {
    const expected = Option.some({ width: 1280, height: 720 })
    assert.deepEqual(imageSize(pngHeader(1280, 720)), expected)
    assert.deepEqual(imageSize(jpegHeader(1280, 720)), expected)
    assert.deepEqual(imageSize(webpExtended(1280, 720)), expected)
    assert.deepEqual(imageSize(webpLossless(1280, 720)), expected)
    assert.deepEqual(imageSize(webpLossy(1280, 720)), expected)
  })

  it("returns none for other bytes", () => {
    assert.deepEqual(imageSize(new Uint8Array([1, 2, 3])), Option.none())
    assert.deepEqual(imageSize(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])), Option.none())
  })
})

describe("nearestAspectRatio", () => {
  it("matches exact shapes", () => {
    assert.equal(nearestAspectRatio({ width: 1280, height: 720 }), "16:9")
    assert.equal(nearestAspectRatio({ width: 1024, height: 1024 }), "1:1")
    assert.equal(nearestAspectRatio({ width: 768, height: 1024 }), "3:4")
  })

  it("picks the closest shape for others", () => {
    assert.equal(nearestAspectRatio({ width: 2048, height: 1024 }), "16:9")
    assert.equal(nearestAspectRatio({ width: 720, height: 1560 }), "9:16")
    assert.equal(nearestAspectRatio({ width: 1100, height: 1000 }), "1:1")
  })
})
