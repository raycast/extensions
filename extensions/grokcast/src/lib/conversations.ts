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
  (now) => new Conversation({ id: String(now), title: "", createdAt: now, updatedAt: now, turns: [] }),
)

/** `conversation` with `turn` added. The first question names it. */
export const withTurn = (conversation: Conversation, turn: ChatTurn): Conversation =>
  new Conversation({
    ...conversation,
    title: Option.getOrElse(
      Option.liftPredicate(conversation.title, (title) => title !== ""),
      () => titleOf(turn.prompt),
    ),
    updatedAt: turn.createdAt + Math.round(turn.seconds * 1000),
    turns: Arr.append(conversation.turns, turn),
  })

/**
 * The copy of one conversation to continue from. The saved copy wins only when it is ahead:
 * Show Conversations may have added turns to it. When saving an answer failed, the open copy
 * has the newer turns, so it wins.
 */
export const newerOf = (saved: Conversation, open: Conversation): Conversation =>
  Option.getOrElse(
    Option.liftPredicate(
      saved,
      (candidate) => candidate.turns.length > open.turns.length || candidate.updatedAt > open.updatedAt,
    ),
    () => open,
  )

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
    yield* Arr.match(conversation.turns, {
      onEmpty: () => Effect.void,
      onNonEmpty: () =>
        update((all) =>
          Arr.take(
            Arr.prepend(
              Arr.filter(all, (old) => old.id !== conversation.id),
              conversation,
            ),
            MAX_CONVERSATIONS,
          ),
        ),
    })
  })

  const remove = Effect.fn("ChatConversations.remove")(function* (id: string) {
    yield* update((all) => Arr.filter(all, (conversation) => conversation.id !== id))
  })

  const clear = store.remove(KEY).pipe(Effect.withSpan("ChatConversations.clear"))

  /** The copy of `open` to continue from: the saved copy when it is ahead, else `open`. */
  const latest = Effect.fn("ChatConversations.latest")(function* (open: Conversation) {
    const all = yield* list

    return Option.getOrElse(
      Option.map(
        Arr.findFirst(all, (saved) => saved.id === open.id),
        (saved) => newerOf(saved, open),
      ),
      () => open,
    )
  })

  return { list, save, remove, clear, latest }
})

export class ChatConversations extends Context.Service<ChatConversations>()("grokcast/ChatConversations", {
  make: makeConversations(),
}) {
  static readonly layer = Layer.effect(ChatConversations, ChatConversations.make)
}
