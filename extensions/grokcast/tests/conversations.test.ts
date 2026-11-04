import assert from "node:assert/strict"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import * as TestClock from "effect/testing/TestClock"
import { ChatTurn } from "../src/lib/chat.ts"
import {
  ChatConversations,
  MAX_CONVERSATIONS,
  newConversation,
  withTurn,
} from "../src/lib/conversations.ts"
import { NOW } from "./support.ts"

const run = <A, E>(program: Effect.Effect<A, E, ChatConversations | KeyValueStore.KeyValueStore>) =>
  Effect.runPromise(
    TestClock.setTime(NOW).pipe(
      Effect.andThen(program),
      Effect.provide(
        ChatConversations.layer.pipe(
          Layer.provideMerge(KeyValueStore.layerMemory),
          Layer.provideMerge(TestClock.layer()),
        ),
      ),
    ),
  )

const turnAt = (createdAt: number, prompt: string) =>
  new ChatTurn({
    id: String(createdAt),
    prompt,
    answer: `Answer to ${prompt}`,
    createdAt,
    model: Option.none(),
    seconds: 2,
    citations: [],
    toolsUsed: [],
    complete: true,
    images: Option.none(),
  })

const titles = ChatConversations.use((saved) => saved.list).pipe(
  Effect.map((all) => all.map((conversation) => conversation.title)),
)

/** Start a conversation one millisecond after the previous one and save it with one question. */
const start = (prompt: string) =>
  TestClock.adjust("1 millis").pipe(
    Effect.andThen(newConversation),
    Effect.map((conversation) => withTurn(conversation, turnAt(conversation.createdAt, prompt))),
    Effect.tap((conversation) => ChatConversations.use((saved) => saved.save(conversation))),
  )

describe("ChatConversations", () => {
  it("names a conversation after its first question and keeps later turns in order", async () => {
    const conversation = await run(
      newConversation.pipe(
        Effect.map((empty) =>
          withTurn(withTurn(empty, turnAt(NOW, "First?")), turnAt(NOW + 5000, "Second?")),
        ),
      ),
    )
    assert.equal(conversation.title, "First?")
    assert.deepEqual(
      conversation.turns.map((turn) => turn.prompt),
      ["First?", "Second?"],
    )
    assert.equal(conversation.updatedAt, NOW + 7000)
  })

  it("lists the most recently saved first, and moves a continued one to the top", async () => {
    const listed = await run(
      Effect.gen(function* () {
        const first = yield* start("first")
        yield* start("second")
        yield* ChatConversations.use((saved) =>
          saved.save(withTurn(first, turnAt(NOW + 10, "again"))),
        )
        return yield* titles
      }),
    )
    assert.deepEqual(listed, ["first", "second"])
  })

  it("does not save a conversation without questions", async () => {
    const listed = await run(
      newConversation.pipe(
        Effect.flatMap((empty) => ChatConversations.use((saved) => saved.save(empty))),
        Effect.andThen(titles),
      ),
    )
    assert.deepEqual(listed, [])
  })

  it(`keeps only the newest ${MAX_CONVERSATIONS}`, async () => {
    const listed = await run(
      Effect.forEach(
        Array.from({ length: MAX_CONVERSATIONS + 2 }, (_, index) => `c${index}`),
        start,
        {
          discard: true,
        },
      ).pipe(Effect.andThen(titles)),
    )
    assert.equal(listed.length, MAX_CONVERSATIONS)
    assert.equal(listed[0], `c${MAX_CONVERSATIONS + 1}`)
  })

  it("removes one conversation, or all of them", async () => {
    const listed = await run(
      Effect.gen(function* () {
        const first = yield* start("first")
        yield* start("second")
        yield* ChatConversations.use((saved) => saved.remove(first.id))
        const afterRemove = yield* titles
        yield* ChatConversations.use((saved) => saved.clear)
        return [afterRemove, yield* titles]
      }),
    )
    assert.deepEqual(listed, [["second"], []])
  })

  it("treats unreadable saved conversations as none", async () => {
    const listed = await run(
      KeyValueStore.KeyValueStore.use((store) => store.set("chat-conversations", "not json")).pipe(
        Effect.andThen(titles),
      ),
    )
    assert.deepEqual(listed, [])
  })
})
