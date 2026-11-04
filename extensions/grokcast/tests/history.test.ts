import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as TestClock from "effect/testing/TestClock"
import { DictationHistory, MAX_HISTORY } from "../src/lib/history.ts"
import { NOW } from "./support.ts"

const run = <A, E>(program: Effect.Effect<A, E, DictationHistory | KeyValueStore.KeyValueStore>) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(program),
      Effect.provide(
        DictationHistory.layer.pipe(
          Layer.provideMerge(KeyValueStore.layerMemory),
          Layer.provideMerge(TestClock.layer()),
        ),
      ),
    ),
  )

const texts = DictationHistory.use((history) => history.list).pipe(
  Effect.map((entries) => entries.map((entry) => entry.text)),
)

/** Add a dictation one millisecond after the previous one. */
const add = (text: string) =>
  TestClock.adjust("1 millis").pipe(
    Effect.andThen(
      DictationHistory.use((history) =>
        history.add({ text, seconds: 1, language: Option.none(), readySeconds: 0.5, live: true }),
      ),
    ),
  )

describe("DictationHistory", () => {
  it("is empty at first", async () => {
    assert.deepEqual(await run(texts), [])
  })

  it("lists dictations newest first", async () => {
    const listed = await run(
      add("first").pipe(Effect.andThen(add("second")), Effect.andThen(texts)),
    )
    assert.deepEqual(listed, ["second", "first"])
  })

  it(`keeps only the newest ${MAX_HISTORY}`, async () => {
    const listed = await run(
      Effect.forEach(
        Array.from({ length: MAX_HISTORY + 5 }, (_, index) => `${index}`),
        add,
        {
          discard: true,
        },
      ).pipe(Effect.andThen(texts)),
    )
    assert.equal(listed.length, MAX_HISTORY)
    assert.equal(listed[0], `${MAX_HISTORY + 4}`)
  })

  it("deletes one dictation, or all of them", async () => {
    const afterRemove = await run(
      Effect.gen(function* () {
        const first = yield* add("first")
        yield* add("second")
        yield* DictationHistory.use((history) => history.remove(first.id))
        return yield* texts
      }),
    )
    assert.deepEqual(afterRemove, ["second"])
    const afterClear = await run(
      add("first").pipe(
        Effect.andThen(DictationHistory.use((history) => history.clear)),
        Effect.andThen(texts),
      ),
    )
    assert.deepEqual(afterClear, [])
  })

  it("reads entries saved before live dictation, which have no language or timing", async () => {
    const listed = await run(
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set("dictation-history", '[{"id":"1","text":"old","createdAt":1,"seconds":2}]')
        return yield* DictationHistory.use((history) => history.list)
      }),
    )
    assert.deepEqual(
      listed.map((entry) => [entry.text, entry.language, entry.readySeconds, entry.live]),
      [["old", Option.none(), Option.none(), Option.none()]],
    )
  })

  it("treats unreadable stored history as empty and replaces it on the next dictation", async () => {
    const listed = await run(
      Effect.gen(function* () {
        const store = yield* KeyValueStore.KeyValueStore
        yield* store.set("dictation-history", "not json")
        const before = yield* texts
        yield* add("fresh")
        return [before, yield* texts]
      }),
    )
    assert.deepEqual(listed, [[], ["fresh"]])
  })
})
