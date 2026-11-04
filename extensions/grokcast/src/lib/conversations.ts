// Saved chats with Grok, most recently used first, kept in a key-value store on this
// Mac (Raycast's LocalStorage in the extension). Only text is kept.

import * as Arr from "effect/Array"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import * as Semaphore from "effect/Semaphore"
import * as KeyValueStore from "effect/persistence/KeyValueStore"
import { ChatTurn, titleOf } from "./chat.ts"

/** The list keeps this many conversations and drops the ones used least recently. */
export const MAX_CONVERSATIONS = 50

const KEY = "chat-conversations"

export class Conversation extends Schema.Class<Conversation>("Conversation")({
  id: Schema.String,
  title: Schema.String,
  /** Unix time in milliseconds. */
  createdAt: Schema.Finite,
  /** Unix time in milliseconds of the last answer. */
  updatedAt: Schema.Finite,
  /** Oldest first. */
  turns: Schema.Array(ChatTurn),
}) {}

/** A new conversation, before its first question. */
export const newConversation = Effect.map(
  Clock.currentTimeMillis,
  (now) =>
    new Conversation({ id: String(now), title: "", createdAt: now, updatedAt: now, turns: [] }),
)

/** `conversation` with `turn` added. The first question names it. */
export const withTurn = (conversation: Conversation, turn: ChatTurn): Conversation =>
  new Conversation({
    ...conversation,
    title: conversation.title === "" ? titleOf(turn.prompt) : conversation.title,
    updatedAt: turn.createdAt + Math.round(turn.seconds * 1000),
    turns: Arr.append(conversation.turns, turn),
  })

const Conversations = Schema.Array(Conversation)

const makeConversations = Effect.fn("ChatConversations.make")(function* () {
  const store = KeyValueStore.toSchemaStore(yield* KeyValueStore.KeyValueStore, Conversations)
  const lock = yield* Semaphore.make(1)

  /** Unreadable conversations (an older format, or a damaged value) count as none. */
  const list = store.get(KEY).pipe(
    Effect.map(Option.getOrElse((): ReadonlyArray<Conversation> => [])),
    Effect.catch(() => Effect.succeed<ReadonlyArray<Conversation>>([])),
    Effect.withSpan("ChatConversations.list"),
  )

  const update = (f: (all: ReadonlyArray<Conversation>) => ReadonlyArray<Conversation>) =>
    lock.withPermits(1)(Effect.flatMap(list, (all) => store.set(KEY, f(all))))

  /** Save `conversation` and move it to the top. A conversation with no turns is not saved. */
  const save = Effect.fn("ChatConversations.save")(function* (conversation: Conversation) {
    if (Arr.isReadonlyArrayEmpty(conversation.turns)) return
    yield* update((all) =>
      Arr.take(
        Arr.prepend(
          Arr.filter(all, (old) => old.id !== conversation.id),
          conversation,
        ),
        MAX_CONVERSATIONS,
      ),
    )
  })

  const remove = Effect.fn("ChatConversations.remove")(function* (id: string) {
    yield* update((all) => Arr.filter(all, (conversation) => conversation.id !== id))
  })

  const clear = store.remove(KEY).pipe(Effect.withSpan("ChatConversations.clear"))

  return ChatConversations.of({ list, save, remove, clear })
})

export class ChatConversations extends Context.Service<
  ChatConversations,
  {
    readonly list: Effect.Effect<ReadonlyArray<Conversation>>
    readonly save: (
      conversation: Conversation,
    ) => Effect.Effect<void, KeyValueStore.KeyValueStoreError | Schema.SchemaError>
    readonly remove: (
      id: string,
    ) => Effect.Effect<void, KeyValueStore.KeyValueStoreError | Schema.SchemaError>
    readonly clear: Effect.Effect<void, KeyValueStore.KeyValueStoreError>
  }
>()("grokcast/ChatConversations") {
  static readonly layer = Layer.effect(ChatConversations, makeConversations())
}
