import assert from "node:assert/strict"
import type { AddressInfo } from "node:net"
import { describe, it } from "node:test"
import * as Effect from "effect/Effect"
import * as Socket from "effect/socket/Socket"
import { WebSocketServer } from "ws"
import { WsWebSocketConstructor } from "../src/lib/live-transcriber.ts"

describe("WsWebSocketConstructor", () => {
  it("sends the authorization header, reads text frames, and fails with 1006 when the server drops", async (t) => {
    const server = new WebSocketServer({ host: "127.0.0.1", port: 0 })
    t.after(() => server.close())
    await new Promise((resolve) => server.once("listening", resolve))
    const received: Array<{ authorization: string; bytes: number }> = []
    server.on("connection", (client, request) => {
      client.send('{"type":"transcript.created"}')
      client.on("message", (data: Buffer) => {
        received.push({ authorization: request.headers.authorization ?? "", bytes: data.length })
        client.terminate()
      })
    })
    // SAFETY: a server listening on a TCP host and port reports an AddressInfo.
    const { port } = server.address() as AddressInfo

    const outcome = await Effect.runPromise(
      Effect.gen(function* () {
        const socket = yield* Socket.makeWebSocket(`ws://127.0.0.1:${port}`, {
          headers: { authorization: "Bearer test" },
        })
        const reader = yield* socket.reader
        const writer = yield* socket.writer
        const first = yield* reader.pull
        yield* writer.write(new Uint8Array([1, 2, 3]))
        const closed = yield* Effect.flip(reader.pull)
        return { first, closed }
      }).pipe(Effect.scoped, Effect.provide(WsWebSocketConstructor)),
    )

    assert.deepEqual(outcome.first, ['{"type":"transcript.created"}'])
    assert.deepEqual(received, [{ authorization: "Bearer test", bytes: 3 }])
    assert.equal(outcome.closed.reason._tag, "SocketCloseError")
    assert.equal(
      outcome.closed.reason._tag === "SocketCloseError" ? outcome.closed.reason.code : 0,
      1006,
    )
  })
})
