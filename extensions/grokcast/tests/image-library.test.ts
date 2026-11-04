import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as TestClock from "effect/testing/TestClock"
import { extensionFor, ImageFiles, ImageLibrary, MAX_IMAGES } from "../src/lib/image-library.ts"
import { GeneratedImage, type ImageRequest } from "../src/lib/images.ts"
import { NOW, pngHeader } from "./support.ts"

/** An in-memory image folder: path to bytes. */
const memoryFiles = () => {
  const files = new Map<string, Uint8Array>()
  const layer = Layer.succeed(
    ImageFiles,
    ImageFiles.of({
      write: (name, bytes) =>
        Effect.sync(() => {
          const path = `/images/${name}`
          files.set(path, bytes)
          return path
        }),
      remove: (path) =>
        Effect.sync(() => {
          files.delete(path)
        }),
    }),
  )
  return { files, layer }
}

const run = <A, E>(
  files: ReturnType<typeof memoryFiles>,
  program: Effect.Effect<A, E, ImageLibrary>,
) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(program),
      Effect.provide(
        ImageLibrary.layer.pipe(
          Layer.provideMerge(Layer.mergeAll(KeyValueStore.layerMemory, files.layer)),
          Layer.provideMerge(TestClock.layer()),
        ),
      ),
    ),
  )

const request = (prompt: string): ImageRequest => ({
  prompt,
  aspectRatio: Option.some("1:1"),
  resolution: Option.none(),
  count: 1,
  sources: [],
})

const image = (mimeType = "image/jpeg") =>
  new GeneratedImage({ bytes: new Uint8Array([1, 2, 3]), mimeType })

/** Add images one millisecond after the previous ones. */
const add = (prompt: string, count = 1) =>
  TestClock.adjust("1 millis").pipe(
    Effect.andThen(
      ImageLibrary.use((library) =>
        library.add(
          request(prompt),
          Array.from({ length: count }, () => image()),
        ),
      ),
    ),
  )

const prompts = ImageLibrary.use((library) => library.list).pipe(
  Effect.map((entries) => entries.map((entry) => entry.prompt)),
)

describe("ImageLibrary", () => {
  it("saves each image as a file and lists the newest first", async () => {
    const files = memoryFiles()
    const [entries, listed] = await run(
      files,
      Effect.gen(function* () {
        yield* add("first")
        const added = yield* add("second", 2)
        return [added, yield* prompts] as const
      }),
    )
    assert.equal(entries.length, 2)
    assert.deepEqual(listed, ["second", "second", "first"])
    assert.equal(files.files.size, 3)
    assert.ok(entries[0]?.path.endsWith(".jpg"))
    assert.deepEqual(entries[0]?.aspectRatio, Option.some("1:1"))
  })

  it("keeps the pixel size xAI chose", async () => {
    const files = memoryFiles()
    const [entry] = await run(
      files,
      ImageLibrary.use((library) =>
        library.add(request("sky"), [
          new GeneratedImage({ bytes: pngHeader(1280, 720), mimeType: "image/png" }),
        ]),
      ),
    )
    assert.deepEqual(entry?.width, Option.some(1280))
    assert.deepEqual(entry?.height, Option.some(720))
  })

  it("deletes one image and its file", async () => {
    const files = memoryFiles()
    const listed = await run(
      files,
      Effect.gen(function* () {
        const [first] = yield* add("first")
        yield* add("second")
        yield* ImageLibrary.use((library) => library.remove(first?.id ?? ""))
        return yield* prompts
      }),
    )
    assert.deepEqual(listed, ["second"])
    assert.equal(files.files.size, 1)
  })

  it("deletes everything", async () => {
    const files = memoryFiles()
    const listed = await run(
      files,
      Effect.gen(function* () {
        yield* add("first", 2)
        yield* ImageLibrary.use((library) => library.clear)
        return yield* prompts
      }),
    )
    assert.deepEqual(listed, [])
    assert.equal(files.files.size, 0)
  })

  it(`keeps the newest ${MAX_IMAGES} images and deletes the files of older ones`, async () => {
    const files = memoryFiles()
    const listed = await run(
      files,
      Effect.gen(function* () {
        yield* add("old", 2)
        yield* add("new", MAX_IMAGES - 1)
        return yield* prompts
      }),
    )
    assert.equal(listed.length, MAX_IMAGES)
    assert.equal(listed.at(-1), "old")
    assert.equal(files.files.size, MAX_IMAGES)
  })

  it("names files by MIME type", () => {
    assert.equal(extensionFor("image/png"), "png")
    assert.equal(extensionFor("image/webp"), "webp")
    assert.equal(extensionFor("image/jpeg"), "jpg")
    assert.equal(extensionFor("application/octet-stream"), "jpg")
  })
})
