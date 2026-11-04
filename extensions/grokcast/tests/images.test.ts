import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Redacted from "effect/Redacted"
import * as Schema from "effect/Schema"
import * as TestClock from "effect/testing/TestClock"
import { ImageGenerator, SourceImage, type ImageRequest } from "../src/lib/images.ts"
import { StoredTokens } from "../src/lib/session.ts"
import {
  fakeFetch,
  json,
  memoryStore,
  NOW,
  testLayer,
  type FakeFetch,
  type MemoryStore,
} from "./support.ts"

const signedIn = () =>
  memoryStore(
    new StoredTokens({
      accessToken: Redacted.make("a1"),
      refreshToken: Option.some(Redacted.make("r1")),
      idToken: Option.none(),
      expiresAt: NOW + 3_600_000,
    }),
  )

const PNG = new Uint8Array([137, 80, 78, 71])

const request = (overrides: Partial<ImageRequest> = {}): ImageRequest => ({
  prompt: "A red fox",
  aspectRatio: Option.none(),
  resolution: Option.none(),
  count: 1,
  sources: [],
  ...overrides,
})

const imagesResponse = (...images: ReadonlyArray<{ b64_json?: string; mime_type?: string }>) =>
  Response.json({ data: images, usage: null })

const create = (fetch: FakeFetch, store: MemoryStore = signedIn(), input = request()) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(ImageGenerator.use((generator) => generator.create(input))),
      Effect.provide(ImageGenerator.layer.pipe(Layer.provideMerge(testLayer(fetch, store)))),
    ),
  )

const createError = (fetch: FakeFetch, store: MemoryStore = signedIn(), input = request()) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(Effect.flip(ImageGenerator.use((generator) => generator.create(input)))),
      Effect.provide(ImageGenerator.layer.pipe(Layer.provideMerge(testLayer(fetch, store)))),
    ),
  )

const Body = Schema.Record(Schema.String, Schema.Unknown)

const bodyOf = (fetch: FakeFetch, index = 0) =>
  Schema.decodeUnknownSync(Schema.fromJsonString(Body))(fetch.requests[index]?.body ?? "")

const base64 = (bytes: Uint8Array) => Buffer.from(bytes).toString("base64")

describe("ImageGenerator.create", () => {
  it("asks xAI for new images as the signed-in user, with no model so xAI picks it", async () => {
    const fetch = fakeFetch(() => imagesResponse({ b64_json: base64(PNG), mime_type: "image/png" }))
    const images = await create(fetch)
    assert.equal(images.length, 1)
    assert.deepEqual([...images[0].bytes], [...PNG])
    assert.equal(images[0].mimeType, "image/png")
    const [sent] = fetch.requests
    assert.equal(sent?.url, "https://api.x.ai/v1/images/generations")
    assert.equal(sent?.method, "POST")
    assert.equal(sent?.headers.get("authorization"), "Bearer a1")
    assert.deepEqual(bodyOf(fetch), { prompt: "A red fox", n: 1, response_format: "b64_json" })
  })

  it("sends the aspect ratio, resolution, and count when the user picks them", async () => {
    const fetch = fakeFetch(() =>
      imagesResponse({ b64_json: base64(PNG) }, { b64_json: base64(PNG) }),
    )
    const images = await create(
      fetch,
      signedIn(),
      request({ aspectRatio: Option.some("16:9"), resolution: Option.some("2k"), count: 2 }),
    )
    assert.equal(images.length, 2)
    // xAI's default output is JPEG.
    assert.equal(images[0].mimeType, "image/jpeg")
    assert.deepEqual(bodyOf(fetch), {
      prompt: "A red fox",
      n: 2,
      response_format: "b64_json",
      aspect_ratio: "16:9",
      resolution: "2k",
    })
  })

  it("edits one image by sending it as a data URL", async () => {
    const fetch = fakeFetch(() => imagesResponse({ b64_json: base64(PNG) }))
    await create(
      fetch,
      signedIn(),
      request({ sources: [new SourceImage({ bytes: PNG, mimeType: "image/png" })] }),
    )
    assert.equal(fetch.requests[0]?.url, "https://api.x.ai/v1/images/edits")
    const body = bodyOf(fetch)
    assert.deepEqual(body.image, { url: `data:image/png;base64,${base64(PNG)}` })
    assert.equal(body.images, undefined)
    assert.equal(body.model, undefined)
  })

  it("edits several images together", async () => {
    const fetch = fakeFetch(() => imagesResponse({ b64_json: base64(PNG) }))
    const source = new SourceImage({ bytes: PNG, mimeType: "image/webp" })
    await create(fetch, signedIn(), request({ sources: [source, source] }))
    const body = bodyOf(fetch)
    assert.equal(body.image, undefined)
    assert.deepEqual(body.images, [
      { url: `data:image/webp;base64,${base64(PNG)}` },
      { url: `data:image/webp;base64,${base64(PNG)}` },
    ])
  })

  it("fails when xAI sends no image", async () => {
    const error = await createError(fakeFetch(() => imagesResponse({ mime_type: "image/png" })))
    assert.equal(error.reason, "failed")
    assert.match(error.message, /did not send an image/)
  })

  it("does not call xAI for an empty prompt or too many images", async () => {
    const fetch = fakeFetch(() => imagesResponse({ b64_json: base64(PNG) }))
    const empty = await createError(fetch, signedIn(), request({ prompt: "  " }))
    assert.equal(empty.reason, "failed")
    const source = new SourceImage({ bytes: PNG, mimeType: "image/png" })
    const many = await createError(
      fetch,
      signedIn(),
      request({ sources: [source, source, source, source] }),
    )
    assert.equal(many.reason, "failed")
    assert.equal(fetch.requests.length, 0)
  })

  it("asks the user to sign in when nobody is signed in, without calling xAI", async () => {
    const fetch = fakeFetch(() => imagesResponse({ b64_json: base64(PNG) }))
    const error = await createError(fetch, memoryStore())
    assert.equal(error.reason, "signIn")
    assert.equal(fetch.requests.length, 0)
  })

  it("explains a 403 as the plan, and a 429 as the usage limit without retrying", async () => {
    const plan = await createError(fakeFetch(() => json({ error: "forbidden" }, 403)))
    assert.equal(plan.reason, "plan")
    assert.match(plan.message, /image generation/)
    const limited = fakeFetch(() => json({ error: "rate limited" }, 429))
    const limit = await createError(limited)
    assert.equal(limit.reason, "usageLimit")
    assert.equal(limited.requests.length, 1)
  })
})
