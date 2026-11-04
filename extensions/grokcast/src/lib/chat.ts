// Chat with Grok as the signed-in user: stream an answer with the xAI Responses API,
// with Grok's own web search, X search, and code execution when the user turns them
// on, and with images the user attaches. No Raycast imports, so tests run it under plain Node with a fake `fetch`.

import type { CreateParams, InputItem, ServerToolCall, Tool } from "@xai-official/sdk"
import { codeExecution, webSearch, xSearch } from "@xai-official/sdk/tools"
import * as Arr from "effect/Array"
import * as Bool from "effect/Boolean"
import * as Clock from "effect/Clock"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as Schema from "effect/Schema"
import { ChatImages, imageMarkdown } from "./chat-images.ts"
import { callXai, describeXaiError, XaiClient, XaiFailureReason } from "./xai.ts"

/** How long Grok may go without sending anything while it answers. Reasoning can be quiet for a while. */
const IDLE_TIMEOUT = Duration.minutes(3)

/** Grok's own tools, which xAI runs. */
export const ChatTool = Schema.Literals(["webSearch", "xSearch", "codeExecution"])

export type ChatTool = typeof ChatTool.Type

/**
 * The model used when the user sets none. xAI's Responses API has no default
 * model: a request without one fails with "The model latest does not exist".
 */
export const DEFAULT_CHAT_MODEL = "grok-4.7"

export const ReasoningEffort = Schema.Literals(["low", "medium", "high"])

export type ReasoningEffort = typeof ReasoningEffort.Type

export class ChatSettings extends Schema.Class<ChatSettings>("ChatSettings")({
  /** A model ID such as `grok-4.7`. None uses `DEFAULT_CHAT_MODEL`. */
  model: Schema.Option(Schema.String),
  /** None leaves it to the model. */
  reasoningEffort: Schema.Option(ReasoningEffort),
  /** Instructions sent with every question, such as "Answer briefly". */
  instructions: Schema.Option(Schema.String),
  tools: Schema.Array(ChatTool),
}) {}

/** The user's chat preferences. */
export class ChatPreferences extends Context.Service<ChatPreferences, ChatSettings>()("grokcast/ChatPreferences") {}

export class Citation extends Schema.Class<Citation>("Citation")({
  url: Schema.String,
  title: Schema.Option(Schema.String),
}) {}

/** One question and Grok's answer. */
export class ChatTurn extends Schema.Class<ChatTurn>("ChatTurn")({
  id: Schema.String,
  prompt: Schema.String,
  answer: Schema.String,
  /** Unix time in milliseconds, when the question was sent. */
  createdAt: Schema.Finite,
  /** The model that answered, as xAI reported it. */
  model: Schema.OptionFromOptionalKey(Schema.String),
  /** Seconds from the question until the answer was complete. */
  seconds: Schema.Finite,
  /** The web pages and posts the answer cites. */
  citations: Schema.Array(Citation),
  /** What Grok's tools did, such as "Searched the web", once each. */
  toolsUsed: Schema.Array(Schema.String),
  /** False when the answer stopped early, such as at the output limit. */
  complete: Schema.Boolean,
  /** Paths of the images attached to the question. Added with image understanding. */
  images: Schema.OptionFromOptionalKey(Schema.Array(Schema.String)),
}) {}

/** `text`, unless it is empty. */
const nonEmpty = Option.liftPredicate((text: string) => text !== "")

/** The images attached to `turn`'s question. */
export const imagesOf = (turn: ChatTurn): ReadonlyArray<string> =>
  Option.getOrElse(turn.images, (): ReadonlyArray<string> => [])

/** Chat failed. `reason` picks what the UI offers, `message` is for the user. */
export class ChatError extends Schema.TaggedError<ChatError>()("ChatError", {
  reason: XaiFailureReason,
  message: Schema.String,
}) {}

/** What `ask` reports while Grok answers. */
export interface ChatProgress {
  /** Grok is reasoning before it answers. */
  readonly thinking: () => void
  /** One of Grok's tools ran, such as "Searched the web". */
  readonly tool: (label: string) => void
  /** The whole answer so far. */
  readonly text: (answer: string) => void
}

/** What `ask` needs besides the question. */
export interface AskContext {
  /** Groups a conversation's requests for xAI's prompt cache. */
  readonly conversationId: string
  /** The earlier turns, oldest first. */
  readonly history: ReadonlyArray<ChatTurn>
  /** Paths of images to send with the question. */
  readonly images: ReadonlyArray<string>
}

/** Images read for a request, by path. A missing path was not readable and is left out. */
export type LoadedImages = ReadonlyMap<string, Blob>

/**
 * The input for a new question: earlier turns as user and assistant messages, then
 * the question. Only the visible text and the attached images are kept between turns,
 * so a saved conversation continues the same way it began.
 */
export const inputOf = (
  history: ReadonlyArray<ChatTurn>,
  prompt: string,
  images: ReadonlyArray<string> = [],
  loaded: LoadedImages = new Map(),
): Array<InputItem> => [
  ...Arr.flatMap(history, (turn) => turnInput(turn, loaded)),
  questionInput(prompt, images, loaded),
]

const turnInput = (turn: ChatTurn, loaded: LoadedImages): Array<InputItem> => [
  questionInput(turn.prompt, imagesOf(turn), loaded),
  { role: "assistant", content: turn.answer },
]

/** A question as plain text, or as text and images when it has readable images. */
const questionInput = (prompt: string, images: ReadonlyArray<string>, loaded: LoadedImages): InputItem =>
  Arr.match(Arr.getSomes(Arr.map(images, (path) => Option.fromNullishOr(loaded.get(path)))), {
    onEmpty: () => ({ role: "user", content: prompt }),
    onNonEmpty: (blobs) => ({
      role: "user",
      content: [
        { type: "input_text", text: prompt },
        ...Arr.map(blobs, (image) => ({ type: "input_image" as const, image })),
      ],
    }),
  })

export const toolsOf = (tools: ReadonlyArray<ChatTool>): Array<Tool> =>
  Arr.map(Arr.dedupe(tools), (tool) =>
    Match.value(tool).pipe(
      Match.when("webSearch", () => webSearch()),
      Match.when("xSearch", () => xSearch()),
      Match.when("codeExecution", () => codeExecution()),
      Match.exhaustive,
    ),
  )

const searchLabel = (name: string): string =>
  Match.value(name).pipe(
    Match.when(
      (search) => search.startsWith("x_"),
      () => "Searched X",
    ),
    Match.when(
      (search) => search.startsWith("web_") || search.startsWith("browse"),
      () => "Searched the web",
    ),
    Match.orElse((search) => `Used ${search.replaceAll("_", " ")}`),
  )

/** What a finished server tool call did, in words for the user. */
export const toolLabel = (call: ServerToolCall): string =>
  Match.value(call).pipe(
    Match.when({ type: "web_search_call" }, () => "Searched the web"),
    Match.when({ type: "x_search_call" }, () => "Searched X"),
    Match.when({ type: "custom_tool_call" }, (custom) => searchLabel(custom.name)),
    Match.when({ type: "code_interpreter_call" }, () => "Ran code"),
    Match.when({ type: "file_search_call" }, () => "Searched files"),
    Match.when({ type: "mcp_call" }, () => "Used a connected tool"),
    Match.when({ type: "image_generation_call" }, () => "Made an image"),
    Match.orElse(() => "Used a tool"),
  )

/** `cut` up to its last space, when that space is in its second half. */
const atWord = (cut: string, max: number): string =>
  Option.match(
    Option.liftPredicate(cut.lastIndexOf(" "), (space) => space > max / 2),
    {
      onNone: () => cut,
      onSome: (space) => cut.slice(0, space),
    },
  )

/** `line`, or its first `max` characters cut at a word, with an ellipsis. */
const shorten = (line: string, max: number): string =>
  Bool.match(line.length <= max, {
    onTrue: () => line,
    onFalse: () => `${atWord(line.slice(0, max), max).trimEnd()}…`,
  })

/** A conversation's title: the first line of its first question, cut at a word. */
export const titleOf = (prompt: string, max = 60): string =>
  shorten(Option.getOrElse(Arr.head(prompt.trim().split("\n")), () => "").trim(), max)

/** The request body, with the user's model or `DEFAULT_CHAT_MODEL`. */
export const requestOf = (
  settings: ChatSettings,
  context: AskContext,
  prompt: string,
  loaded: LoadedImages = new Map(),
): CreateParams => ({
  input: inputOf(context.history, prompt, context.images, loaded),
  prompt_cache_key: `grokcast-chat:${context.conversationId}`,
  ...Option.match(settings.instructions, {
    onNone: () => ({}),
    onSome: (instructions) => ({ instructions }),
  }),
  ...Option.match(settings.reasoningEffort, {
    onNone: () => ({}),
    onSome: (effort) => ({ reasoning: { effort } }),
  }),
  ...Arr.match(toolsOf(settings.tools), {
    onEmpty: () => ({}),
    onNonEmpty: (tools) => ({ tools }),
  }),
  model: Option.getOrElse(settings.model, () => DEFAULT_CHAT_MODEL),
})

const makeChat = Effect.fn("Chat.make")(function* () {
  const xai = yield* XaiClient
  const files = yield* ChatImages

  /**
   * Read every image the request sends. An image on an earlier turn that can no
   * longer be read is left out; one attached to this question fails the question.
   */
  const loadImages = Effect.fn("Chat.loadImages")(function* (context: AskContext) {
    const fail = (message: string) => new ChatError({ reason: "failed", message })

    const current = yield* Effect.forEach(context.images, (path) =>
      files.read(path).pipe(
        Effect.map((blob) => [path, blob] as const),
        Effect.mapError((error) => fail(error.message)),
      ),
    )

    const earlier = yield* Effect.forEach(Arr.flatMap(context.history, imagesOf), (path) =>
      files.read(path).pipe(
        Effect.map((blob) => [path, blob] as const),
        Effect.option,
      ),
    )

    return new Map([...Arr.getSomes(earlier), ...current])
  })

  /** Ask Grok `prompt` after the turns in `context`, and stream the answer to `progress`. */
  const ask = Effect.fn("Chat.ask")(function* (
    prompt: string,
    context: AskContext,
    settings: ChatSettings,
    progress: ChatProgress,
  ) {
    const client = yield* xai.client.pipe(
      Effect.mapError((error) => new ChatError({ reason: "failed", message: error.message })),
    )

    const loaded = yield* loadImages(context)
    const startedAt = yield* Clock.currentTimeMillis
    const seen = { answer: "", citations: Arr.empty<Citation>(), tools: Arr.empty<string>() }

    const response = yield* callXai((signal) =>
      client.responses
        .create(
          { ...requestOf(settings, context, prompt, loaded), stream: true },
          // A 429 here is usually the plan's usage limit, so say so at once instead of waiting.
          { signal, maxRetries: 0, idleTimeout: Duration.toMillis(IDLE_TIMEOUT) },
        )
        .then((stream) =>
          stream
            .on("reasoning", () => progress.thinking())
            .on("text", (delta) => {
              seen.answer += delta
              progress.text(seen.answer)
            })
            .on("server_tool_call", (call) => {
              const label = toolLabel(call)

              // Each tool is listed once, where it first ran.
              seen.tools = Arr.dedupe(Arr.append(seen.tools, label))
              progress.tool(label)
            })
            .on("citation", (citation) => {
              // Each URL is cited once, with the title it first came with.
              seen.citations = Arr.dedupeWith(
                Arr.append(
                  seen.citations,
                  new Citation({
                    url: citation.url,
                    title: Option.filter(Option.fromNullishOr(citation.title), (title) => title !== ""),
                  }),
                ),
                (first, second) => first.url === second.url,
              )
            })
            .done(),
        ),
    ).pipe(
      Effect.mapError(
        (error) => new ChatError(describeXaiError(error, { feature: "chat", failed: "Grok could not answer" })),
      ),
    )

    const finishedAt = yield* Clock.currentTimeMillis
    const answer = response.toText().trim()

    return new ChatTurn({
      id: String(startedAt),
      prompt,
      answer: Option.getOrElse(nonEmpty(answer), () => seen.answer.trim()),
      createdAt: startedAt,
      model: Option.filter(Option.fromNullishOr(response.model), (model) => model !== ""),
      seconds: (finishedAt - startedAt) / 1000,
      citations: seen.citations,
      toolsUsed: seen.tools,
      complete: response.status === "completed",
      images: Arr.match(context.images, {
        onEmpty: () => Option.none(),
        onNonEmpty: (images) => Option.some(images),
      }),
    })
  })

  return { ask }
})

export class Chat extends Context.Service<Chat>()("grokcast/Chat", { make: makeChat() }) {
  static readonly layer = Layer.effect(Chat, Chat.make)
}

/** A citation's name: its title, or its site. */
const sourceName = (citation: Citation): string =>
  Option.getOrElse(citation.title, () =>
    Option.getOrElse(
      Option.map(Option.liftThrowable(() => new URL(citation.url))(), (url) => url.hostname.replace(/^www\./, "")),
      () => citation.url,
    ),
  )

/** A citation as a Markdown link, named by its title or its site. */
const sourceLink = (citation: Citation): string =>
  `[${sourceName(citation).replaceAll("[", "(").replaceAll("]", ")")}](${citation.url})`

/** Such as `grok-4.7 · 3.2 s · Searched the web`. */
export const footerOf = (turn: ChatTurn): string =>
  Arr.join(
    [
      ...Option.toArray(turn.model),
      `${turn.seconds.toFixed(1)} s`,
      ...turn.toolsUsed,
      ...Bool.match(turn.complete, {
        onTrue: () => [],
        onFalse: () => ["The answer stopped early"],
      }),
    ],
    " · ",
  )

/** A turn for the detail pane: the question, the answer, its sources, and a footer. */
export const turnMarkdown = (turn: ChatTurn): string =>
  Arr.join(
    [
      `**${turn.prompt.trim()}**`,
      ...Arr.map(imagesOf(turn), imageMarkdown),
      Option.getOrElse(nonEmpty(turn.answer), () => "_Grok gave no answer._"),
      ...Arr.match(turn.citations, {
        onEmpty: () => [],
        onNonEmpty: (citations) => [
          `**Sources**\n\n${Arr.join(
            Arr.map(citations, (citation, index) => `${index + 1}. ${sourceLink(citation)}`),
            "\n",
          )}`,
        ],
      }),
      `_${footerOf(turn)}_`,
    ],
    "\n\n",
  )
