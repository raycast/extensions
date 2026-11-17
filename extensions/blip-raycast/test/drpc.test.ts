import assert from "node:assert/strict";
import { test } from "node:test";
import { PassThrough, Duplex } from "node:stream";
import { encodeFrame, encodeVarint, FrameParser, FrameKind, unaryCall, DrpcError, DrpcTimeoutError } from "../src/lib/drpc";

test("varints encode like protobuf", () => {
  assert.deepEqual([...encodeVarint(0)], [0]);
  assert.deepEqual([...encodeVarint(127)], [127]);
  assert.deepEqual([...encodeVarint(300)], [0xac, 0x02]);
});

test("frames round-trip through the parser, even when split mid-frame", () => {
  const bytes = Buffer.concat([
    encodeFrame(FrameKind.Invoke, 1, 1, Buffer.from("/rpc.Service/GetState")),
    encodeFrame(FrameKind.Message, 1, 2, Buffer.alloc(300, 7), false),
  ]);
  const parser = new FrameParser();
  const frames = [...parser.push(bytes.subarray(0, 10)), ...parser.push(bytes.subarray(10))];
  assert.equal(frames.length, 2);
  assert.equal(frames[0].kind, FrameKind.Invoke);
  assert.equal(frames[0].data.toString(), "/rpc.Service/GetState");
  assert.equal(frames[1].done, false);
  assert.equal(frames[1].data.length, 300);
});

test("control frames are skipped", () => {
  const control = encodeFrame(FrameKind.Message, 1, 1, Buffer.from("ignore me"));
  control[0] |= 0x80;
  const frames = new FrameParser().push(Buffer.concat([control, encodeFrame(FrameKind.Message, 1, 2, Buffer.from("ok"))]));
  assert.deepEqual(
    frames.map((frame) => frame.data.toString()),
    ["ok"],
  );
});

/** A fake server: replies with `reply` once the client's CloseSend arrives. */
function fakeServer(reply: (requestFrames: number[]) => Buffer, { hang = false } = {}) {
  const toServer = new PassThrough();
  const toClient = new PassThrough();
  const parser = new FrameParser();
  const kinds: number[] = [];
  toServer.on("data", (chunk: Buffer) => {
    for (const frame of parser.push(chunk)) {
      kinds.push(frame.kind);
      if (frame.kind === FrameKind.CloseSend && !hang) toClient.write(reply(kinds));
    }
  });
  return () => Duplex.from({ writable: toServer, readable: toClient });
}

test("unary call sends Invoke, Message, CloseSend and joins split responses", async () => {
  let seen: number[] = [];
  const connect = fakeServer((kinds) => {
    seen = [...kinds];
    return Buffer.concat([
      encodeFrame(FrameKind.Message, 1, 1, Buffer.from("hel"), false),
      encodeFrame(FrameKind.Message, 1, 1, Buffer.from("lo"), true),
      encodeFrame(FrameKind.CloseSend, 1, 2, Buffer.alloc(0)),
    ]);
  });
  const result = await unaryCall(connect, "/x", new Uint8Array([1]), { timeoutMs: 1000 });
  assert.equal(result.toString(), "hello");
  assert.deepEqual(seen, [FrameKind.Invoke, FrameKind.Message, FrameKind.CloseSend]);
});

test("error frames surface the server's message", async () => {
  const data = Buffer.concat([Buffer.alloc(8), Buffer.from("proto: not found")]);
  const connect = fakeServer(() => encodeFrame(FrameKind.Error, 1, 1, data));
  await assert.rejects(unaryCall(connect, "/x", new Uint8Array(), { timeoutMs: 1000 }), (e: unknown) => {
    assert.ok(e instanceof DrpcError);
    assert.equal((e as Error).message, "proto: not found");
    return true;
  });
});

test("silent servers time out with a DrpcTimeoutError", async () => {
  const connect = fakeServer(() => Buffer.alloc(0), { hang: true });
  await assert.rejects(unaryCall(connect, "/x", new Uint8Array(), { timeoutMs: 50 }), DrpcTimeoutError);
});
