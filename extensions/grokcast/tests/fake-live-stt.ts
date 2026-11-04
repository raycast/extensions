import * as Arr from "effect/Array"
import * as Layer from "effect/Layer"
import * as P from "effect/Predicate"
import * as Schema from "effect/Schema"
import * as Socket from "effect/socket/Socket"

type Listener = (event: Socket.WebSocketEvent) => void
type EventType = "open" | "message" | "error" | "close"

/** A server event, as xAI sends it. */
export interface XaiEvent {
  readonly type: string
  readonly [field: string]: string | number | boolean
}

const encodeEvent = Schema.encodeSync(Schema.fromJsonString(Schema.Unknown))

export const created = { type: "transcript.created", id: "session" }

export const partial = (text: string, isFinal = false, speechFinal = false, language = "en") =>
  ({
    type: "transcript.partial",
    text,
    is_final: isFinal,
    speech_final: speechFinal,
    language,
  }) as const

export const done = { type: "transcript.done", text: "", duration: 1 }

/** What the fake xAI does on each step of a session. */
export interface Script {
  /** Refuse the connection, as for a 401, before it opens. */
  readonly refuse?: boolean
  /** Sent when the connection opens. */
  readonly onOpen?: ReadonlyArray<XaiEvent>
  /** Sent after each audio frame. */
  readonly onAudio?: ReadonlyArray<XaiEvent>
  /** Sent after `audio.done`. */
  readonly onAudioDone?: ReadonlyArray<XaiEvent>
  /** Drop the connection without a close frame (1006) after `onAudioDone`, as xAI does. */
  readonly dropAfterDone?: boolean
  /** Drop the connection (1006) after this many audio frames. */
  readonly dropAfterFrames?: number
}

/** A stand-in for a WebSocket to xAI's streaming speech-to-text. */
export class FakeSocket implements Socket.WebSocketLike {
  readyState = 0
  /** Audio frames received, and whether `created` was sent before each. */
  readonly audio: Array<{ readonly bytes: number; readonly afterCreated: boolean }> = []
  /** Text frames received. */
  readonly texts: Array<string> = []
  private createdSent = false
  private readonly listeners: Array<{ type: EventType; listener: Listener; once: boolean }> = []

  constructor(
    readonly url: string,
    readonly headers: Readonly<Record<string, string>>,
    private readonly script: Script,
  ) {
    setImmediate(() => {
      if (script.refuse) {
        this.emit("error", { type: "error" })
        this.drop()
        return
      }
      this.readyState = 1
      this.emit("open", { type: "open" })
      this.sendAll(script.onOpen ?? [created])
    })
  }

  addEventListener(type: EventType, listener: Listener, options?: { readonly once?: boolean }) {
    this.listeners.push({ type, listener, once: options?.once === true })
  }

  removeEventListener(type: EventType, listener: Listener) {
    const index = this.listeners.findIndex(
      (entry) => entry.type === type && entry.listener === listener,
    )
    if (index >= 0) this.listeners.splice(index, 1)
  }

  close(code = 1000) {
    if (this.readyState >= 2) return
    this.readyState = 3
    this.emit("close", { type: "close", code })
  }

  send(data: string | Uint8Array) {
    if (this.readyState !== 1) return
    if (P.isString(data)) {
      this.texts.push(data)
      setImmediate(() => {
        this.sendAll(this.script.onAudioDone ?? [done])
        if (this.script.dropAfterDone) this.drop()
      })
      return
    }
    const frames = this.audio.push({ bytes: data.byteLength, afterCreated: this.createdSent })
    setImmediate(() => {
      this.sendAll(this.script.onAudio ?? [])
      if (frames === this.script.dropAfterFrames) this.drop()
    })
  }

  private sendAll(events: ReadonlyArray<XaiEvent>) {
    events.forEach((event) => {
      if (this.readyState !== 1) return
      if (event.type === "transcript.created") this.createdSent = true
      this.emit("message", { type: "message", data: encodeEvent(event) })
    })
  }

  private drop() {
    this.readyState = 3
    this.emit("close", { type: "close", code: 1006 })
  }

  private emit(type: EventType, event: Socket.WebSocketEvent) {
    this.listeners
      .filter((entry) => entry.type === type)
      .forEach((entry) => {
        if (entry.once) this.removeEventListener(type, entry.listener)
        entry.listener(event)
      })
  }
}

/** A fake xAI streaming endpoint. Each connection follows `script`. */
export const fakeLiveStt = (script: Script = {}) => {
  const sockets: Array<FakeSocket> = []
  const layer = Layer.succeed(
    Socket.WebSocketConstructor,
    Socket.WebSocketConstructor.of((url, options) => {
      const headers =
        P.isString(options) || Arr.isArray(options) || P.isUndefined(options)
          ? {}
          : (options.headers ?? {})
      const socket = new FakeSocket(url, headers, script)
      sockets.push(socket)
      return socket
    }),
  )
  return { sockets, layer }
}
