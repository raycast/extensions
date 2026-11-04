// Live speech-to-text over xAI's streaming endpoint, as the signed-in user, so the
// text shows while the user speaks. The xAI SDK does not cover this endpoint. No
// Raycast imports, so tests run it under plain Node with a fake WebSocket.

import * as Arr from "effect/Array"
import * as Context from "effect/Context"
import * as Duration from "effect/Duration"
import * as Effect from "effect/Effect"
import * as Layer from "effect/Layer"
import * as Match from "effect/Match"
import * as Option from "effect/Option"
import * as P from "effect/Predicate"
import * as Redacted from "effect/Redacted"
import * as Ref from "effect/Ref"
import * as Schema from "effect/Schema"
import * as Stream from "effect/Stream"
import * as HttpClient from "effect/http/HttpClient"
import * as Socket from "effect/socket/Socket"
import WebSocket from "ws"
import { BYTES_PER_SAMPLE, joinChunks, SAMPLE_RATE } from "./recorder.ts"
import { GrokSession } from "./session.ts"

/** xAI's streaming speech-to-text endpoint. The token is sent only here. */
export const LIVE_STT_URL = "wss://api.x.ai/v1/stt"

/** Silence, in milliseconds, that ends an utterance. Grok Build uses the same value. */
const ENDPOINTING_MS = 400

/** Audio goes out in 100 ms frames. */
export const FRAME_BYTES = (SAMPLE_RATE / 10) * BYTES_PER_SAMPLE

/** Bytes in whole units of `size` at the start of `bytes`. */
const wholeLength = (bytes: Uint8Array, size: number) => bytes.byteLength - (bytes.byteLength % size)

/** The whole frames in `joined`, each in its own buffer, and the bytes left after them. */
const framesOf = (joined: Uint8Array) =>
  [
    joined.slice(wholeLength(joined, FRAME_BYTES)),
    Array.from({ length: Math.floor(joined.byteLength / FRAME_BYTES) }, (_, index) =>
      joined.slice(index * FRAME_BYTES, (index + 1) * FRAME_BYTES),
    ),
  ] as const

/**
 * Regroup recorder chunks into `FRAME_BYTES` frames, each in its own buffer, and a
 * shorter last frame of whole samples. xAI reads each frame as whole samples.
 */
export const toFrames: <E, R>(audio: Stream.Stream<Uint8Array, E, R>) => Stream.Stream<Uint8Array, E, R> =
  Stream.mapAccum(
    () => new Uint8Array(0),
    (pending: Uint8Array, chunk: Uint8Array) => framesOf(joinChunks([pending, chunk])),
    {
      onHalt: (pending) =>
        Arr.filter([pending.slice(0, wholeLength(pending, BYTES_PER_SAMPLE))], (frame) => frame.byteLength > 0),
    },
  )

/** How long to wait for the connection to open. */
const OPEN_TIMEOUT = Duration.seconds(10)

/** Live transcription stopped. Dictation then sends the whole recording instead. */
export class LiveTranscriptionError extends Schema.TaggedError<LiveTranscriptionError>()("LiveTranscriptionError", {
  message: Schema.String,
}) {}

const failed = (message: string) => new LiveTranscriptionError({ message })

/** The streaming URL for 16 kHz PCM. A language also makes xAI write numbers as digits. */
export const liveSttUrl = (language: Option.Option<string>): string =>
  `${LIVE_STT_URL}?${new URLSearchParams({
    sample_rate: String(SAMPLE_RATE),
    encoding: "pcm",
    interim_results: "true",
    endpointing: String(ENDPOINTING_MS),
    ...Option.match(language, { onNone: () => ({}), onSome: (code) => ({ language: code }) }),
  })}`

/** Tells xAI that all audio was sent. */
const AUDIO_DONE = '{"type":"audio.done"}'

const Created = Schema.Struct({ type: Schema.Literal("transcript.created") })

const flag = Schema.Boolean.pipe(Schema.withDecodingDefaultKey(Effect.succeed(false)))

/**
 * Text for the piece of speech in progress. `is_final` marks a piece that will not
 * change. `speech_final` marks the end of an utterance; its text restates the whole
 * utterance, including the earlier final pieces.
 */
export const Partial = Schema.Struct({
  type: Schema.Literal("transcript.partial"),
  text: Schema.String,
  is_final: flag,
  speech_final: flag,
  /** The language xAI hears, such as `en`. */
  language: Schema.OptionFromOptionalKey(Schema.String),
})

export type Partial = typeof Partial.Type

/** The last event. Its text has come back empty, so the text comes from the partials. */
const Done = Schema.Struct({ type: Schema.Literal("transcript.done"), text: Schema.String })

const ServerFailure = Schema.Struct({ type: Schema.Literal("error"), message: Schema.String })

const ServerEvent = Schema.Union([Created, Partial, Done, ServerFailure])

type ServerEvent = typeof ServerEvent.Type

/** The events before `transcript.done`. */
type LiveEvent = Exclude<ServerEvent, typeof Done.Type>

const decodeEvent = Schema.decodeUnknownOption(Schema.fromJsonString(ServerEvent))

/** A server frame as an event. Unknown events are skipped. */
const eventOf = (frame: Uint8Array | string): Option.Option<ServerEvent> =>
  decodeEvent(
    Match.value(frame).pipe(
      Match.when(P.isString, (text) => text),
      Match.orElse((bytes) => new TextDecoder().decode(bytes)),
    ),
  )

/** The text heard so far. */
export class LiveText extends Schema.Class<LiveText>("LiveText")({
  /** Finished utterances. */
  utterances: Schema.Array(Schema.String),
  /** Final pieces of the utterance in progress. */
  pieces: Schema.Array(Schema.String),
  /** The piece in progress. It can still change. */
  interim: Schema.String,
  /** The last language xAI reported. */
  language: Schema.Option(Schema.String),
}) {
  static readonly empty = new LiveText({
    utterances: [],
    pieces: [],
    interim: "",
    language: Option.none(),
  })
}

const joinWords = (parts: ReadonlyArray<string>): string =>
  parts.flatMap((part) => Arr.fromOption(Option.liftPredicate(part.trim(), (word) => word !== ""))).join(" ")

/** Add one partial to the text heard so far. */
export const addPartial = (previous: LiveText, partial: Partial): LiveText =>
  withPartial(
    new LiveText({
      ...previous,
      language: Option.orElse(
        Option.filter(partial.language, (code) => code !== ""),
        () => previous.language,
      ),
    }),
    partial,
  )

/** The utterance a `speech_final` partial ends: its text, or the final pieces when it has none. */
const utteranceOf = (live: LiveText, partial: Partial): string =>
  Option.liftPredicate(partial.text, (text) => text.trim() !== "").pipe(Option.getOrElse(() => joinWords(live.pieces)))

const withPartial = (live: LiveText, partial: Partial): LiveText =>
  Match.value(partial).pipe(
    Match.when(
      { speech_final: true },
      () =>
        new LiveText({
          ...live,
          utterances: Arr.append(live.utterances, utteranceOf(live, partial)),
          pieces: [],
          interim: "",
        }),
    ),
    Match.when(
      { is_final: true },
      () => new LiveText({ ...live, pieces: Arr.append(live.pieces, partial.text), interim: "" }),
    ),
    Match.orElse(() => new LiveText({ ...live, interim: partial.text })),
  )

/**
 * Everything heard so far, as one text. A piece that never became final is kept,
 * because the words are better than nothing.
 */
export const textOf = (live: LiveText): string => joinWords([...live.utterances, ...live.pieces, live.interim])

/** What live transcription heard. */
export class LiveTranscript extends Schema.Class<LiveTranscript>("LiveTranscript")({
  text: Schema.String,
  /** The last language xAI reported, such as `en`. */
  language: Schema.Option(Schema.String),
}) {}

const makeLiveTranscriber = Effect.fn("LiveTranscriber.make")(function* () {
  const session = yield* GrokSession
  const http = yield* HttpClient.HttpClient
  const webSocket = yield* Socket.WebSocketConstructor

  const transcribe = Effect.fn("LiveTranscriber.transcribe")(
    function* (audio: Stream.Stream<Uint8Array>, language: Option.Option<string>, onText: (text: string) => void) {
      const token = yield* session.accessToken.pipe(
        Effect.provideService(HttpClient.HttpClient, http),
        Effect.mapError((error) => failed(error.message)),
      )

      const socket = yield* Socket.makeWebSocket(liveSttUrl(language), {
        headers: { authorization: `Bearer ${Redacted.value(token)}` },
        openTimeout: OPEN_TIMEOUT,
      })

      const reader = yield* socket.reader
      const writer = yield* socket.writer
      const heard = yield* Ref.make(LiveText.empty)
      const audioDone = yield* Ref.make(false)

      // Audio waits in `audio` until xAI says the session started.
      const sendAudio = audio.pipe(
        toFrames,
        Stream.runForEach((chunk) => writer.write(chunk)),
        Effect.andThen(writer.write(AUDIO_DONE)),
        Effect.andThen(Ref.set(audioDone, true)),
      )

      const startAudio = Effect.forkScoped(sendAudio).pipe(Effect.asVoid)

      const showPartial = (partial: Partial) =>
        Ref.updateAndGet(heard, (live) => addPartial(live, partial)).pipe(
          Effect.flatMap((live) =>
            Effect.sync(() => {
              onText(textOf(live))
            }),
          ),
        )

      const handle = (event: LiveEvent) =>
        Match.value(event).pipe(
          Match.when({ type: "transcript.created" }, () => startAudio),
          Match.when({ type: "transcript.partial" }, showPartial),
          Match.when({ type: "error" }, (failure) => Effect.fail(failed(failure.message))),
          Match.exhaustive,
        )

      yield* Stream.fromPull(Effect.succeed(reader.pull)).pipe(
        Stream.map((frame) => Arr.fromOption(eventOf(frame))),
        Stream.flattenIterable,
        // `transcript.done` is the last event and has nothing to show.
        Stream.takeWhile((event): event is LiveEvent => event.type !== "transcript.done"),
        Stream.runForEach(handle),
        // xAI drops the connection without a close frame (1006) after the last event.
        // After all audio was sent, any close ends the transcript normally.
        Effect.catchTag("SocketError", (error) =>
          Ref.get(audioDone).pipe(
            Effect.filterOrFail(
              (done) => done,
              () => failed(error.message),
            ),
            Effect.asVoid,
          ),
        ),
      )
      const live = yield* Ref.get(heard)

      return new LiveTranscript({ text: textOf(live), language: live.language })
    },
    Effect.scoped,
    Effect.catchTag("SocketError", (error) => Effect.fail(failed(error.message))),
    Effect.provideService(Socket.WebSocketConstructor, webSocket),
  )

  return { transcribe }
})

/**
 * Streams mono 16 kHz signed 16-bit little-endian PCM to xAI until the audio ends.
 * `onText` gets everything heard so far after each update. Succeeds with the whole
 * text.
 */
export class LiveTranscriber extends Context.Service<LiveTranscriber>()("grokcast/LiveTranscriber", {
  make: makeLiveTranscriber(),
}) {
  static readonly layer = Layer.effect(LiveTranscriber, LiveTranscriber.make)
}

/** Options without headers: a protocol, a list of protocols, or none. */
const isProtocols = (
  options: Socket.WebSocketConstructorOptions | undefined,
): options is string | Array<string> | undefined =>
  P.isString(options) || Arr.isArray(options) || P.isUndefined(options)

/**
 * WebSockets from the `ws` package, which can send the authorization header. Raycast
 * runs Node, and Tinycast supports `ws` but has no WebSocket that takes headers.
 */
export const WsWebSocketConstructor = Layer.succeed(
  Socket.WebSocketConstructor,
  Socket.WebSocketConstructor.of((url, options) =>
    Match.value(options).pipe(
      Match.when(isProtocols, (protocols) => new WebSocket(url, protocols)),
      Match.orElse((client) => new WebSocket(url, client.protocols, { headers: client.headers })),
    ),
  ),
)
